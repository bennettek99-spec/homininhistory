/**
 * Data store.
 *
 * Loading strategy, in priority order:
 *
 *   1. `manifest.json` + `core.bin` + `dicts.json`  (~1.6 MB) — everything the
 *      globe, timeline, filters and charts need. Fetched before first paint.
 *   2. `sites.json`, `publications.json`, `populations.json`, PCA — fetched in
 *      the background right after first paint, so the UI is interactive while
 *      they arrive.
 *   3. `detail/NNNN.json` — one 512-individual shard, fetched only when a user
 *      opens an individual. Cached; in-flight requests are de-duplicated.
 *
 * `core.bin` is a structure-of-arrays block: each column is a contiguous run of
 * one typed array, so we can create zero-copy views straight onto the
 * ArrayBuffer instead of parsing 23,089 JSON objects.
 */

const BASE = 'data/';

const state = {
  manifest: null,
  dicts: null,
  col: {},            // name -> typed array view
  n: 0,
  ids: null,          // string[]  (lazy)
  sites: null,        // lazy
  publications: null, // lazy
  populations: null,  // lazy
  pca: {},            // lazy, keyed 'mt' | 'y'
  summary: null,
  arcs: null,
  siteMembers: null,  // Int32Array CSR built from the `site` column
  siteOffsets: null,
};

const shardCache = new Map();   // shardIndex -> record[]
const shardInFlight = new Map();
const lazyInFlight = new Map();

/* ── core load ───────────────────────────────────────────────────────── */

export async function loadCore(onProgress = () => {}) {
  onProgress(0.05, 'Reading manifest');
  state.manifest = await getJSON('manifest.json');

  onProgress(0.15, 'Loading dictionaries');
  const [dicts, buf] = await Promise.all([
    getJSON('dicts.json'),
    fetch(BASE + 'core.bin', { cache: 'force-cache' }).then((r) => {
      if (!r.ok) throw new Error(`core.bin: HTTP ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);

  onProgress(0.55, 'Mapping columns');
  state.dicts = dicts;
  state.n = state.manifest.n_individuals;

  const CTOR = {
    Float32Array, Int32Array, Uint16Array, Uint8Array, Uint32Array, Int16Array,
  };
  for (const c of state.manifest.columns) {
    const Ctor = CTOR[c.type];
    if (!Ctor) throw new Error(`Unknown column type ${c.type}`);
    state.col[c.name] = new Ctor(buf, c.offset, c.length);
  }

  const expected = state.manifest.stride * state.n;
  if (buf.byteLength !== expected) {
    throw new Error(
      `core.bin is ${buf.byteLength} bytes, manifest expects ${expected}. ` +
      `Re-run the build pipeline.`);
  }

  onProgress(0.75, 'Indexing sites');
  buildSiteIndex();

  onProgress(0.9, 'Ready');
  return state;
}

/**
 * CSR index from site id -> individual row indices.
 *
 * Rebuilt here rather than shipped, because the `site` column already encodes
 * it and a JSON copy would cost ~1 MB of transfer for data we can derive in
 * about a millisecond.
 */
function buildSiteIndex() {
  const site = state.col.site;
  if (!site) return;
  let maxSite = -1;
  for (let i = 0; i < site.length; i++) if (site[i] > maxSite) maxSite = site[i];

  const nSites = maxSite + 1;
  const counts = new Int32Array(nSites + 1);
  for (let i = 0; i < site.length; i++) if (site[i] >= 0) counts[site[i] + 1]++;
  for (let s = 0; s < nSites; s++) counts[s + 1] += counts[s];

  const members = new Int32Array(counts[nSites]);
  const cursor = counts.slice(0, nSites);
  for (let i = 0; i < site.length; i++) {
    const s = site[i];
    if (s >= 0) members[cursor[s]++] = i;
  }
  state.siteOffsets = counts;
  state.siteMembers = members;
}

/** Row indices belonging to one site. */
export function membersOfSite(siteId) {
  const { siteOffsets: off, siteMembers: mem } = state;
  if (!off || siteId < 0 || siteId + 1 >= off.length) return [];
  return Array.from(mem.subarray(off[siteId], off[siteId + 1]));
}

/* ── lazy payloads ───────────────────────────────────────────────────── */

function lazy(key, file, transform = (x) => x) {
  return () => {
    if (state[key] != null) return Promise.resolve(state[key]);
    if (lazyInFlight.has(key)) return lazyInFlight.get(key);
    const p = getJSON(file)
      .then((data) => {
        state[key] = transform(data);
        lazyInFlight.delete(key);
        return state[key];
      })
      .catch((err) => {
        lazyInFlight.delete(key);
        throw err;
      });
    lazyInFlight.set(key, p);
    return p;
  };
}

export const loadSites = lazy('sites', 'sites.json');
export const loadPublications = lazy('publications', 'publications.json');
export const loadPopulations = lazy('populations', 'populations.json');
export const loadSummary = lazy('summary', 'summary.json');
export const loadArcs = lazy('arcs', 'arcs.json');

// ids.txt is newline-delimited text rather than JSON, so it needs its own path.
export function loadIdsText() {
  if (state.ids) return Promise.resolve(state.ids);
  if (lazyInFlight.has('ids')) return lazyInFlight.get('ids');
  const p = fetch(BASE + 'ids.txt', { cache: 'force-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`ids.txt: HTTP ${r.status}`);
      return r.text();
    })
    .then((t) => {
      // Trim defensively: a build produced on Windows without newline="" would
      // leave a trailing \r on every ID, which silently breaks ID lookups.
      state.ids = t.split('\n').map((s) => s.trim());
      lazyInFlight.delete('ids');
      return state.ids;
    })
    .catch((e) => { lazyInFlight.delete('ids'); throw e; });
  lazyInFlight.set('ids', p);
  return p;
}

export function loadPCA(which) {
  const key = `pca:${which}`;
  if (state.pca[which]) return Promise.resolve(state.pca[which]);
  if (lazyInFlight.has(key)) return lazyInFlight.get(key);
  const p = getJSON(`pca_${which}.json`)
    .then((d) => {
      state.pca[which] = d && d.points ? d : null;
      lazyInFlight.delete(key);
      return state.pca[which];
    })
    .catch((e) => { lazyInFlight.delete(key); throw e; });
  lazyInFlight.set(key, p);
  return p;
}

/* ── detail shards ───────────────────────────────────────────────────── */

/** Full record for one individual, fetching its shard if needed. */
export async function getDetail(rowIndex) {
  const size = state.manifest.shard_size;
  const shard = Math.floor(rowIndex / size);
  const records = await getShard(shard);
  const rec = records[rowIndex - shard * size];
  // Shards are dense and ordered, so the offset arithmetic is exact; verify
  // rather than trust, because a stale shard would silently show wrong data.
  if (rec && rec.i !== rowIndex) {
    return records.find((r) => r.i === rowIndex) || null;
  }
  return rec || null;
}

function getShard(shard) {
  if (shardCache.has(shard)) return Promise.resolve(shardCache.get(shard));
  if (shardInFlight.has(shard)) return shardInFlight.get(shard);

  const name = `detail/${String(shard).padStart(4, '0')}.json`;
  const p = getJSON(name)
    .then((data) => {
      shardCache.set(shard, data);
      shardInFlight.delete(shard);
      // Keep memory bounded on long sessions; shards are cheap to refetch.
      if (shardCache.size > 24) {
        shardCache.delete(shardCache.keys().next().value);
      }
      return data;
    })
    .catch((e) => { shardInFlight.delete(shard); throw e; });

  shardInFlight.set(shard, p);
  return p;
}

/** Warm the shards covering a set of rows, without blocking on them. */
export function prefetchDetails(rows) {
  const size = state.manifest.shard_size;
  const shards = new Set(rows.map((r) => Math.floor(r / size)));
  for (const s of [...shards].slice(0, 4)) {
    if (!shardCache.has(s) && !shardInFlight.has(s)) getShard(s).catch(() => {});
  }
}

/* ── accessors ───────────────────────────────────────────────────────── */

export const S = state;
export const col = (name) => state.col[name];
export const dict = (name) => state.dicts[name] || [];

/** Decode a dictionary-coded column value for one row. */
export const dv = (name, i) => {
  const c = state.col[name];
  const d = state.dicts[name];
  return c && d ? (d[c[i]] ?? '') : '';
};

/** Publication record for a row, or null (65535 is the "none" sentinel). */
export function publicationOf(i) {
  const pi = state.col.publication[i];
  if (pi === 65535 || !state.publications) return null;
  return state.publications[pi] || null;
}

export function siteOf(i) {
  const s = state.col.site[i];
  if (s < 0 || !state.sites) return null;
  return state.sites[s] || null;
}

export function hasFlag(i, flagName) {
  const bit = state.manifest.flags[flagName];
  return bit != null && (state.col.flags[i] & bit) !== 0;
}

/** Genetic ID for a row; requires loadIdsText() to have resolved. */
export const idOf = (i) => (state.ids ? state.ids[i] : `#${i}`);

/* ── fetch helper ────────────────────────────────────────────────────── */

async function getJSON(name) {
  const res = await fetch(BASE + name, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${res.statusText}`);
  try {
    return await res.json();
  } catch {
    throw new Error(`${name}: response was not valid JSON`);
  }
}
