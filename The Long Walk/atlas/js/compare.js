/**
 * Side-by-side comparison of up to four individuals.
 *
 * Rows where the individuals genuinely differ are highlighted. Genetic
 * relatedness is deliberately *not* computed: it needs genotypes, and the only
 * kinship information the AADR annotation carries is the curator-entered
 * "Family relations" string, which is reported as-is.
 */

import { getDetail, idOf, col } from './store.js';
import {
  n0, n1, n2, compact, bpToEra, bpLabel, dateFull, haversine, escapeHtml,
  PERIOD_COLORS, NEUTRAL,
} from './format.js';
import { $, el, toast } from './ui.js';

const MAX = 4;
let panel, bodyEl;
let picks = [];

export function init() {
  panel = $('#compare');
  bodyEl = $('#compare-body');
  $('#btn-compare-close').addEventListener('click', close);
}

export function add(rowIndex) {
  if (picks.includes(rowIndex)) {
    toast('Already in the comparison');
    return;
  }
  if (picks.length >= MAX) picks.shift();
  picks.push(rowIndex);
  panel.hidden = false;
  render();
}

export function close() {
  panel.hidden = true;
  picks = [];
}

export const count = () => picks.length;

async function render() {
  bodyEl.replaceChildren(el('div', { class: 'chart-note', text: 'Loading…' }));

  let records;
  try {
    records = await Promise.all(picks.map((i) => getDetail(i)));
  } catch (err) {
    bodyEl.replaceChildren(el('div', { class: 'callout warn',
      text: `Could not load records: ${err.message || err}` }));
    return;
  }
  records = records.filter(Boolean);
  if (!records.length) { close(); return; }

  const ROWS = [
    ['Group', (d) => d.group],
    ['Site', (d) => d.siteName],
    ['Country', (d) => d.country],
    ['Period', (d) => d.period],
    ['Culture', (d) => d.culture || null],
    ['Date', (d) => dateFull(d.dateMeanBP)],
    ['Years BP', (d) => d.dateMeanBP != null ? n0(d.dateMeanBP) : null],
    ['Direct ¹⁴C', (d) => d.directDate ? 'yes' : 'no'],
    ['Genetic sex', (d) => ({ M: 'Male', F: 'Female', U: '—' })[d.sex]],
    ['Age at death', (d) => d.ageText],
    ['mtDNA', (d) => d.mt],
    ['Y', (d) => d.y],
    ['Coverage', (d) => d.coverage != null ? `${n2(d.coverage)}×` : null],
    ['SNPs (1240k)', (d) => d.snps1240k ? compact(d.snps1240k) : null],
    ['ROH > 20 cM', (d) => d.rohSumCM != null ? `${n1(d.rohSumCM)} cM` : null],
    ['Data type', (d) => d.dataType],
    ['QC', (d) => d.assessment],
    ['Family relations', (d) => d.family],
    ['Publication', (d) => d.publication],
  ];

  const cols = records.length;
  const grid = el('div', { class: 'cmp-grid',
    style: { gridTemplateColumns: `120px repeat(${cols}, minmax(0, 1fr))` } });

  // header
  grid.append(el('div', { class: 'ch', text: '' }));
  for (const d of records) {
    grid.append(el('div', {},
      el('div', { class: 'cid', text: d.id }),
      el('div', { style: { fontSize: '10px', color: 'var(--ink-4)',
        marginTop: '2px' }, text: d.period || '' })));
  }

  for (const [label, fn] of ROWS) {
    const values = records.map((d) => {
      try { return fn(d); } catch { return null; }
    });
    if (values.every((v) => v == null || v === '')) continue;

    const distinct = new Set(values.map((v) => String(v ?? '—')));
    grid.append(el('div', { class: 'ch', text: label }));
    for (const v of values) {
      grid.append(el('div', {
        class: distinct.size > 1 ? 'diff' : '',
        text: v == null || v === '' ? '—' : String(v),
      }));
    }
  }

  bodyEl.replaceChildren(grid);

  // Geographic and temporal separation, which are computable from what we have.
  if (records.length === 2) {
    const [a, b] = records;
    const bits = [];
    if (a.dateMeanBP != null && b.dateMeanBP != null) {
      const gap = Math.abs(a.dateMeanBP - b.dateMeanBP);
      bits.push(`${n0(gap)} years apart (about ${n0(gap / 29)} generations)`);
    }
    const lat = col('lat'), lon = col('lon');
    const [aLat, aLon] = [lat[a.i], lon[a.i]];
    const [bLat, bLon] = [lat[b.i], lon[b.i]];
    if (!Number.isNaN(aLat) && !Number.isNaN(bLat)) {
      bits.push(`${n0(haversine(aLat, aLon, bLat, bLon))} km apart`);
    }
    if (bits.length) {
      bodyEl.append(el('div', { class: 'callout', style: { marginTop: '11px' } },
        bits.join(' · ')));
    }
  }

  bodyEl.append(el('div', { class: 'callout info', style: { marginTop: '11px' } },
    el('b', { text: 'Relatedness not shown. ' }),
    'Genetic relatedness, IBD sharing and shared-drift statistics all require ' +
    'genotype data. The “Family relations” row above is the curator-entered ' +
    'AADR field, reported verbatim.'));

  bodyEl.append(el('button', {
    class: 'btn ghost', style: { marginTop: '11px' },
    onclick: () => { picks = []; close(); },
  }, 'Clear comparison'));
}
