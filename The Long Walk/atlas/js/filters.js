/**
 * Filter engine.
 *
 * All filtering runs against the typed-array columns in the store, so a full
 * re-evaluation of 23,089 individuals across every active predicate costs well
 * under a millisecond and can be run synchronously on every timeline frame.
 *
 * Facet counts use the standard "exclude own dimension" rule: the count shown
 * next to `Neolithic` is how many individuals would match if Neolithic were
 * added to the current period selection, not how many match right now. Without
 * that rule every unselected option reads zero as soon as one is selected.
 */

import { S, col, dict } from './store.js';

/** Dictionary-coded columns exposed as multi-select facets. */
export const FACETS = [
  { key: 'period', label: 'Period', column: 'period' },
  { key: 'region', label: 'Region', column: 'region' },
  { key: 'country', label: 'Country', column: 'country', searchable: true },
  { key: 'culture', label: 'Culture', column: 'culture', searchable: true },
  { key: 'subsistence', label: 'Subsistence', column: 'subsistence' },
  { key: 'population', label: 'Population', column: 'population', searchable: true },
  { key: 'sex', label: 'Genetic sex', column: 'sex' },
  { key: 'mtRoot', label: 'mtDNA clade', column: 'mtRoot' },
  { key: 'yRoot', label: 'Y clade', column: 'yRoot' },
  { key: 'assessment', label: 'QC assessment', column: 'assessment' },
  { key: 'dataType', label: 'Data type', column: 'dataType', searchable: true },
];

/** Continuous columns exposed as dual-handle ranges. */
export const RANGES = [
  { key: 'coverage', label: 'Mean coverage', column: 'coverage',
    min: 0, max: 40, step: 0.1, unit: '×', log: true },
  { key: 'snps', label: 'SNPs hit (1240k)', column: 'snps',
    min: 0, max: 1200000, step: 5000, unit: '', log: true,
    missingIsZero: true },
  { key: 'roh', label: 'ROH > 20 cM (sum)', column: 'roh',
    min: 0, max: 400, step: 5, unit: ' cM' },
];

// Sentinels for "the time window is wide open".
const TIME_FLOOR = 0;
const TIME_CEIL = 500000;

/** Single-bit predicates from the flags byte, plus a couple of derived ones. */
export const TOGGLES = [
  { key: 'hasCoords', label: 'Mapped only',
    note: 'Exclude individuals with no published coordinates', flag: 'HAS_COORDS',
    default: true },
  { key: 'ancientOnly', label: 'Ancient only',
    note: 'Exclude present-day reference panels', flag: 'PRESENT_DAY',
    invert: true, default: true },
  { key: 'directDate', label: 'Directly dated',
    note: 'Radiocarbon date on the individual, not the context',
    flag: 'DIRECT_DATE' },
  { key: 'hasY', label: 'Y haplogroup called', flag: 'HAS_Y' },
  { key: 'hasMT', label: 'mtDNA haplogroup called', flag: 'HAS_MT' },
  { key: 'hasROH', label: 'ROH measured', flag: 'HAS_ROH' },
  { key: 'noWarnings', label: 'No QC warnings',
    note: 'Exclude individuals flagged for contamination or other issues',
    flag: 'WARNINGS', invert: true },
];

const listeners = new Set();

export const state = {
  timeBP: [0, 500000],   // [latest, earliest] in years BP
  facets: {},            // key -> Set of dictionary indices
  ranges: {},            // key -> [min, max] or null when unconstrained
  toggles: {},           // key -> bool
  pinnedRows: null,      // Set of row indices from search; overrides everything
};

let result = {
  rows: new Int32Array(0),
  mask: null,
  n: 0,
  nSites: 0,
  facetCounts: {},
  version: 0,
};

/* ── setup ───────────────────────────────────────────────────────────── */

export function init() {
  for (const f of FACETS) state.facets[f.key] = new Set();
  for (const r of RANGES) state.ranges[r.key] = null;
  for (const t of TOGGLES) state.toggles[t.key] = !!t.default;
  result.mask = new Uint8Array(S.n);
  evaluate();
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(result);
}

/* ── mutation ────────────────────────────────────────────────────────── */

export function setTime(minBP, maxBP) {
  const lo = Math.min(minBP, maxBP), hi = Math.max(minBP, maxBP);
  if (state.timeBP[0] === lo && state.timeBP[1] === hi) return;
  state.timeBP = [lo, hi];
  evaluate();
}

export function toggleFacet(key, index) {
  const set = state.facets[key];
  if (!set) return;
  if (set.has(index)) set.delete(index); else set.add(index);
  evaluate();
}

export function setFacet(key, indices) {
  state.facets[key] = new Set(indices);
  evaluate();
}

export function clearFacet(key) {
  if (state.facets[key]?.size) { state.facets[key].clear(); evaluate(); }
}

export function setRange(key, lo, hi) {
  const spec = RANGES.find((r) => r.key === key);
  if (!spec) return;
  state.ranges[key] = (lo <= spec.min && hi >= spec.max) ? null : [lo, hi];
  evaluate();
}

export function setToggle(key, on) {
  if (state.toggles[key] === on) return;
  state.toggles[key] = on;
  evaluate();
}

export function pinRows(rows) {
  state.pinnedRows = rows && rows.length ? new Set(rows) : null;
  evaluate();
}

export function reset({ keepTime = false } = {}) {
  for (const f of FACETS) state.facets[f.key].clear();
  for (const r of RANGES) state.ranges[r.key] = null;
  for (const t of TOGGLES) state.toggles[t.key] = !!t.default;
  state.pinnedRows = null;
  if (!keepTime) state.timeBP = [0, 500000];
  evaluate();
}

/** True when anything other than the defaults is in play. */
export function isActive() {
  if (state.pinnedRows) return true;
  if (state.timeBP[0] > 0 || state.timeBP[1] < 500000) return true;
  for (const f of FACETS) if (state.facets[f.key].size) return true;
  for (const r of RANGES) if (state.ranges[r.key]) return true;
  for (const t of TOGGLES) if (state.toggles[t.key] !== !!t.default) return true;
  return false;
}

export function activeCount(key) {
  return state.facets[key]?.size || 0;
}

/* ── evaluation ──────────────────────────────────────────────────────── */

/**
 * Does row i pass every predicate except those belonging to `skipFacet`?
 * Kept as one function so facet counting and the main pass cannot drift apart.
 */
function passes(i, skipFacet) {
  if (state.pinnedRows && !state.pinnedRows.has(i)) return false;

  // Toggles
  const flags = S.col.flags[i];
  for (const t of TOGGLES) {
    if (!state.toggles[t.key]) continue;
    const bit = S.manifest.flags[t.flag];
    const has = (flags & bit) !== 0;
    if (t.invert ? has : !has) return false;
  }

  // Time. Each individual covers a dating interval [latest, earliest] in years
  // BP; it matches when that interval *overlaps* the window. Containment would
  // be wrong -- a sample dated 3000-2000 BP is genuinely evidence about 2500 BP
  // even if the user's window is only 2600-2400 BP.
  //
  // Undated individuals drop out as soon as the window narrows at all. Keeping
  // them would misrepresent every time-restricted view as more complete than
  // the evidence supports.
  const [lo, hi] = state.timeBP;
  if (lo > TIME_FLOOR || hi < TIME_CEIL) {
    const mean = S.col.dateMean[i];
    if (Number.isNaN(mean)) return false;
    let earliest = S.col.dateEarliest[i];
    let latest = S.col.dateLatest[i];
    if (Number.isNaN(earliest)) earliest = mean;
    if (Number.isNaN(latest)) latest = mean;
    if (latest > earliest) { const t = latest; latest = earliest; earliest = t; }
    if (latest > hi || earliest < lo) return false;
  }

  // Facets
  for (const f of FACETS) {
    if (f.key === skipFacet) continue;
    const set = state.facets[f.key];
    if (set.size && !set.has(S.col[f.column][i])) return false;
  }

  // Ranges. A missing measurement fails a constrained range: "coverage above
  // 1x" must not quietly include individuals whose coverage was never recorded.
  for (const r of RANGES) {
    const range = state.ranges[r.key];
    if (!range) continue;
    const v = S.col[r.column][i];
    if (Number.isNaN(v)) return false;
    // Integer columns encode "unrecorded" as 0 rather than NaN.
    if (r.missingIsZero && v === 0) return false;
    if (v < range[0] || v > range[1]) return false;
  }

  return true;
}

export function evaluate() {
  const n = S.n;
  const mask = result.mask;
  const rows = [];

  for (let i = 0; i < n; i++) {
    const ok = passes(i, null);
    mask[i] = ok ? 1 : 0;
    if (ok) rows.push(i);
  }

  const siteCol = S.col.site;
  const seen = new Set();
  for (let k = 0; k < rows.length; k++) {
    const s = siteCol[rows[k]];
    if (s >= 0) seen.add(s);
  }

  result = {
    rows: Int32Array.from(rows),
    mask,
    n: rows.length,
    nSites: seen.size,
    facetCounts: countFacets(),
    version: result.version + 1,
  };
  emit();
  return result;
}

/** Per-option counts, each computed with its own dimension released. */
function countFacets() {
  const out = {};
  for (const f of FACETS) {
    const size = dict(f.column).length;
    const counts = new Int32Array(size);
    const column = S.col[f.column];
    for (let i = 0; i < S.n; i++) {
      if (passes(i, f.key)) counts[column[i]]++;
    }
    out[f.key] = counts;
  }
  return out;
}

export const current = () => result;

/**
 * Options for one facet, sorted by count, with empty and unlabelled entries
 * pushed out of the way but never hidden -- a zero count is information.
 */
export function facetOptions(key, { limit = 400 } = {}) {
  const spec = FACETS.find((f) => f.key === key);
  if (!spec) return [];
  const values = dict(spec.column);
  const counts = result.facetCounts[key];
  const selected = state.facets[key];

  const opts = [];
  for (let idx = 0; idx < values.length; idx++) {
    const label = values[idx];
    if (label === '' && !selected.has(idx)) continue;
    opts.push({
      index: idx,
      label: label || '(unrecorded)',
      count: counts ? counts[idx] : 0,
      selected: selected.has(idx),
    });
  }

  // Period and region read as chronologies/geographies, not rankings, so they
  // keep their canonical order; everything else sorts by frequency.
  if (key === 'period' || key === 'region') {
    const order = dict(key === 'period' ? 'periodOrder' : 'regionOrder');
    opts.sort((a, b) => {
      const ai = order.indexOf(a.label), bi = order.indexOf(b.label);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
  } else {
    opts.sort((a, b) =>
      (b.selected - a.selected) || (b.count - a.count) ||
      a.label.localeCompare(b.label));
  }
  return opts.slice(0, limit);
}

/** Serialise state into a URL fragment so views can be shared. */
export function toHash() {
  const p = new URLSearchParams();
  if (state.timeBP[0] > 0 || state.timeBP[1] < 500000) {
    p.set('t', `${Math.round(state.timeBP[0])}-${Math.round(state.timeBP[1])}`);
  }
  for (const f of FACETS) {
    const set = state.facets[f.key];
    if (set.size) {
      const values = dict(f.column);
      p.set(f.key, [...set].map((i) => values[i]).join('|'));
    }
  }
  for (const r of RANGES) {
    if (state.ranges[r.key]) p.set(r.key, state.ranges[r.key].join('-'));
  }
  const tog = TOGGLES.filter((t) => state.toggles[t.key] !== !!t.default)
    .map((t) => t.key);
  if (tog.length) p.set('tog', tog.join('|'));
  return p.toString();
}

export function fromHash(hash) {
  if (!hash) return false;
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  let touched = false;

  const t = p.get('t');
  if (t && /^\d+-\d+$/.test(t)) {
    const [a, b] = t.split('-').map(Number);
    state.timeBP = [Math.min(a, b), Math.max(a, b)];
    touched = true;
  }
  for (const f of FACETS) {
    const raw = p.get(f.key);
    if (!raw) continue;
    const values = dict(f.column);
    const set = new Set();
    for (const label of raw.split('|')) {
      const idx = values.indexOf(label);
      if (idx >= 0) set.add(idx);
    }
    if (set.size) { state.facets[f.key] = set; touched = true; }
  }
  for (const r of RANGES) {
    const raw = p.get(r.key);
    if (raw && /^[\d.]+-[\d.]+$/.test(raw)) {
      const [a, b] = raw.split('-').map(Number);
      state.ranges[r.key] = [a, b];
      touched = true;
    }
  }
  const tog = p.get('tog');
  if (tog) {
    for (const key of tog.split('|')) {
      const spec = TOGGLES.find((x) => x.key === key);
      if (spec) { state.toggles[key] = !spec.default; touched = true; }
    }
  }
  if (touched) evaluate();
  return touched;
}
