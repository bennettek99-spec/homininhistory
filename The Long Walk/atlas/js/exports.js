/**
 * Export the current selection.
 *
 * Exports carry provenance: every file names the AADR release it came from,
 * the filters that produced it, and the citation the AADR asks for. A CSV that
 * arrives on someone's desk without that context is how derived data becomes
 * misattributed.
 */

import { S, col, dv, idOf, loadIdsText, getDetail, loadSites } from './store.js';
import * as filters from './filters.js';
import { n0, bpToEra } from './format.js';
import { $, el, download, toast } from './ui.js';

const CITATION =
  'Mallick S, Micco A, Mah M, et al. (2024) The Allen Ancient DNA Resource ' +
  '(AADR): A curated compendium of ancient human genomes. Scientific Data 11:182.';

export function init() {
  const pop = $('#layers');   // export shares the popover group; see main.js
  return { csv: exportCSV, geojson: exportGeoJSON, png: exportPNG };
}

/** Human-readable description of the active filters, for export headers. */
export function describeSelection() {
  const bits = [];
  const [lo, hi] = filters.state.timeBP;
  if (lo > 0 || hi < 500000) {
    bits.push(`time ${Math.round(hi)}-${Math.round(lo)} BP ` +
      `(${bpToEra(hi)} to ${bpToEra(lo)})`);
  }
  for (const f of filters.FACETS) {
    const set = filters.state.facets[f.key];
    if (!set.size) continue;
    const values = S.dicts[f.column];
    bits.push(`${f.label}: ${[...set].map((i) => values[i]).join('; ')}`);
  }
  for (const r of filters.RANGES) {
    const range = filters.state.ranges[r.key];
    if (range) bits.push(`${r.label}: ${range[0].toFixed(2)}-${range[1].toFixed(2)}`);
  }
  for (const t of filters.TOGGLES) {
    if (filters.state.toggles[t.key] !== !!t.default) {
      bits.push(`${t.label}: ${filters.state.toggles[t.key] ? 'on' : 'off'}`);
    }
  }
  return bits.length ? bits.join(' | ') : 'no filters (full dataset)';
}

function header(kind) {
  return [
    `# AADR Globe Explorer — ${kind} export`,
    `# Source: Allen Ancient DNA Resource ${S.manifest.release} ` +
      `(${S.manifest.source_file})`,
    `# Source DOI: ${S.manifest.source_doi}`,
    `# Selection: ${describeSelection()}`,
    `# Individuals: ${n0(filters.current().n)} of ${n0(S.n)}`,
    `# Exported: ${new Date().toISOString()}`,
    `# Cite: ${CITATION}`,
  ];
}

const COLUMNS = [
  ['genetic_id', (i) => idOf(i)],
  ['group_id', (i) => dv('population', i)],
  ['country', (i) => dv('country', i)],
  ['region', (i) => dv('region', i)],
  ['latitude', (i) => fmt(col('lat')[i], 5)],
  ['longitude', (i) => fmt(col('lon')[i], 5)],
  ['date_mean_bp', (i) => fmt(col('dateMean')[i], 0)],
  ['date_sd_bp', (i) => fmt(col('dateSd')[i], 0)],
  ['date_earliest_bp', (i) => fmt(col('dateEarliest')[i], 0)],
  ['date_latest_bp', (i) => fmt(col('dateLatest')[i], 0)],
  ['period', (i) => dv('period', i)],
  ['culture', (i) => dv('culture', i)],
  ['subsistence_inferred', (i) => dv('subsistence', i)],
  ['molecular_sex', (i) => dv('sex', i)],
  ['mt_clade', (i) => dv('mtRoot', i)],
  ['y_clade', (i) => dv('yRoot', i)],
  ['coverage', (i) => fmt(col('coverage')[i], 4)],
  ['snps_1240k', (i) => (col('snps')[i] || '')],
  ['roh_sum_cm', (i) => fmt(col('roh')[i], 2)],
  ['data_type', (i) => dv('dataType', i)],
  ['assessment', (i) => dv('assessment', i)],
  ['direct_date', (i) => (col('flags')[i] & S.manifest.flags.DIRECT_DATE) ? '1' : '0'],
];

const fmt = (v, dp) =>
  (v == null || Number.isNaN(v)) ? '' : Number(v).toFixed(dp);

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportCSV() {
  await loadIdsText();
  const rows = filters.current().rows;
  if (!rows.length) { toast('Nothing selected to export'); return; }

  const lines = header('CSV');
  lines.push(COLUMNS.map((c) => c[0]).join(','));
  for (const i of rows) {
    lines.push(COLUMNS.map(([, fn]) => csvCell(fn(i))).join(','));
  }
  download(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    `aadr-selection-${stamp()}.csv`);
  toast(`Exported ${n0(rows.length)} individuals as CSV`);
}

export async function exportGeoJSON() {
  await loadIdsText();
  const rows = filters.current().rows;
  const lat = col('lat'), lon = col('lon');

  const features = [];
  for (const i of rows) {
    if (Number.isNaN(lat[i])) continue;
    const props = {};
    for (const [name, fn] of COLUMNS) {
      const v = fn(i);
      if (v !== '' && v != null) props[name] = v;
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [+lon[i].toFixed(5), +lat[i].toFixed(5)] },
      properties: props,
    });
  }
  if (!features.length) { toast('No mapped individuals in the selection'); return; }

  const fc = {
    type: 'FeatureCollection',
    metadata: {
      source: `Allen Ancient DNA Resource ${S.manifest.release}`,
      source_doi: S.manifest.source_doi,
      selection: describeSelection(),
      n_features: features.length,
      exported: new Date().toISOString(),
      citation: CITATION,
    },
    features,
  };
  download(new Blob([JSON.stringify(fc, null, 1)],
    { type: 'application/geo+json' }), `aadr-selection-${stamp()}.geojson`);
  toast(`Exported ${n0(features.length)} mapped individuals as GeoJSON`);
}

/**
 * Snapshot the globe.
 *
 * deck.gl's WebGL context does not preserve its drawing buffer, so the canvas
 * is blank by the time toBlob runs unless we force a redraw and read it in the
 * same frame. `redraw(true)` does that.
 */
export function exportPNG() {
  const canvas = $('#deck-canvas');
  const deckInstance = window.__deck;
  if (!canvas) { toast('Globe not ready'); return; }

  try {
    deckInstance?.redraw?.(true);
  } catch { /* fall through to a plain read */ }

  requestAnimationFrame(() => {
    canvas.toBlob((blob) => {
      if (!blob) {
        toast('Could not capture the globe — try a screenshot instead');
        return;
      }
      // Composite onto the page background so the PNG is not transparent.
      const img = new Image();
      img.onload = () => {
        const out = document.createElement('canvas');
        out.width = img.width;
        out.height = img.height + 44;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#04060a';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(img, 0, 0);

        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.font = '13px -apple-system, Segoe UI, system-ui, sans-serif';
        ctx.fillText(
          `AADR ${S.manifest.release} · ${n0(filters.current().n)} individuals · ` +
          `${describeSelection().slice(0, 110)}`, 16, img.height + 18);
        ctx.fillStyle = 'rgba(255,255,255,.32)';
        ctx.font = '11px -apple-system, Segoe UI, system-ui, sans-serif';
        ctx.fillText(`doi:${S.manifest.source_doi} · exported ${new Date().toISOString().slice(0, 10)}`,
          16, img.height + 34);

        out.toBlob((final) => {
          download(final, `aadr-globe-${stamp()}.png`);
          toast('Globe exported as PNG');
        }, 'image/png');
      };
      img.onerror = () => toast('Could not compose the PNG');
      img.src = URL.createObjectURL(blob);
    }, 'image/png');
  });
}

/** Everything about the selected individuals, including the text fields. */
export async function exportFullJSON() {
  const rows = filters.current().rows;
  if (!rows.length) { toast('Nothing selected'); return; }
  if (rows.length > 4000) {
    toast(`${n0(rows.length)} is too many for a full export — narrow to 4,000 or fewer`);
    return;
  }
  toast(`Assembling ${n0(rows.length)} full records…`);

  const out = [];
  for (const i of rows) {
    try {
      const d = await getDetail(i);
      if (d) out.push(d);
    } catch { /* skip individuals whose shard failed */ }
  }
  download(new Blob([JSON.stringify({
    source: `Allen Ancient DNA Resource ${S.manifest.release}`,
    source_doi: S.manifest.source_doi,
    selection: describeSelection(),
    citation: CITATION,
    exported: new Date().toISOString(),
    individuals: out,
  }, null, 1)], { type: 'application/json' }),
    `aadr-full-${stamp()}.json`);
  toast(`Exported ${n0(out.length)} full records`);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
