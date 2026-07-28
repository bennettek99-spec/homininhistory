/**
 * Analytics panel.
 *
 * Charts are hand-built SVG rather than a plotting library: the whole panel is
 * about 12 KB of code against ~700 KB for a general-purpose library, and every
 * chart here re-renders on every filter change, so control over the update path
 * matters more than breadth of chart types.
 *
 * Conventions, applied uniformly:
 *   - thin marks, 4px rounded ends anchored to the baseline, 2px gaps between
 *     stacked segments
 *   - recessive grid and axes; values in ink tokens, never in the series colour
 *   - a hover tooltip on every mark
 *   - a legend whenever more than one series is on screen, with direct labels
 *     where they fit, so identity is never carried by colour alone
 */

import { S, col, dv, dict, loadPCA, loadPublications, loadPopulations } from './store.js';
import * as filters from './filters.js';
import * as modules from './modules.js';
import {
  PERIOD_COLORS, PERIOD_RAMP, SEQUENTIAL, ASSESSMENT_COLORS, STATUS,
  CATEGORICAL, NEUTRAL, cladeColor, rampColor, rgbToCss, n0, n1, n2, compact,
  bpToT, tToBp, bpToEra, bpLabel, escapeHtml,
} from './format.js';
import { $, el, frag, emptyState, skeleton, showTip, hideTip, raf } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const INK = 'var(--ink-4)';

let panel, body, tabsEl;
let tab = 'time';
let dirty = true;

export function init() {
  panel = $('#charts');
  body = $('#charts-body');
  tabsEl = $('#chart-tabs');

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    tab = btn.dataset.tab;
    for (const t of tabsEl.querySelectorAll('.tab')) {
      t.classList.toggle('is-on', t === btn);
    }
    render();
  });

  $('#btn-charts-close').addEventListener('click', () => { panel.hidden = true; });
  filters.onChange(() => { dirty = true; if (!panel.hidden) scheduleRender(); });
}

export function open() {
  panel.hidden = false;
  render();
}

export const isOpen = () => !panel.hidden;

const scheduleRender = raf(() => render());

function render() {
  if (panel.hidden) return;
  dirty = false;
  const rows = filters.current().rows;

  if (!rows.length) {
    body.replaceChildren(emptyState('No individuals match these filters',
      'Widen the time window or clear a filter.'));
    return;
  }

  const views = {
    time: timeTab, quality: qualityTab, geography: geographyTab,
    haplo: haploTab, pca: pcaTab, papers: papersTab, modules: modulesTab,
  };
  const out = views[tab]?.(rows);
  if (out instanceof Promise) {
    body.replaceChildren(skeleton(7));
    out.then((node) => { if (tab in views) body.replaceChildren(node); })
       .catch((err) => body.replaceChildren(
         emptyState('Could not load this view', String(err.message || err))));
  } else {
    body.replaceChildren(out);
  }
}

/* ═══ SVG primitives ══════════════════════════════════════════════════ */

function svg(w, h) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.setAttribute('class', 'chart-svg');
  s.setAttribute('preserveAspectRatio', 'none');
  s.style.height = `${h}px`;
  return s;
}

function node(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) n.setAttribute(k, v);
  }
  return n;
}

/** Bar with rounded outer end, anchored flat to the baseline. */
function bar(x, y, w, h, fill, r = 4) {
  const rr = Math.min(r, w / 2, h);
  if (h <= 0.4) return node('rect', { x, y: y + h - 0.4, width: w, height: 0.4, fill });
  const p = node('path', {
    d: `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} ` +
       `L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} ` +
       `L${x + w},${y + h} Z`,
    fill,
  });
  p.setAttribute('class', 'bar');
  return p;
}

function hbar(x, y, w, h, fill, r = 4) {
  const rr = Math.min(r, h / 2, w);
  if (w <= 0.4) return node('rect', { x, y, width: 0.4, height: h, fill });
  const p = node('path', {
    d: `M${x},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} ` +
       `L${x + w},${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} ` +
       `L${x},${y + h} Z`,
    fill,
  });
  p.setAttribute('class', 'bar');
  return p;
}

function text(x, y, str, attrs = {}) {
  const t = node('text', { x, y, ...attrs });
  t.textContent = str;
  return t;
}

/** Attach a hover tooltip to any SVG element. */
function tip(element, html) {
  element.style.cursor = 'default';
  element.addEventListener('pointerenter', (e) => showTip(html, e.clientX, e.clientY));
  element.addEventListener('pointermove', (e) => showTip(html, e.clientX, e.clientY));
  element.addEventListener('pointerleave', hideTip);
  return element;
}

function card(title, note, subtitle, ...content) {
  return el('div', { class: 'chart-card' },
    el('div', { class: 'chart-head' },
      el('span', { class: 'chart-title', text: title }),
      note && el('span', { class: 'chart-note', text: note })),
    subtitle && el('div', { class: 'chart-sub', text: subtitle }),
    ...content.filter(Boolean));
}

/** Legend chips. Always present when more than one series is drawn. */
function legendRow(items) {
  return el('div', {
    class: 'lg-items',
    style: { marginTop: '9px', gap: '3px 11px' },
  }, ...items.map(({ label, color, n }) =>
    el('span', { class: 'lg-item' },
      el('span', { class: 'lg-sw', style: { background: color, color } }),
      `${label}${n != null ? ` (${compact(n)})` : ''}`)));
}

/* ═══ Time ════════════════════════════════════════════════════════════ */

function timeTab(rows) {
  return frag(
    card('Individuals through time',
      `${n0(rows.length)} selected`,
      'Bars are equal-width in log-time, so the last two millennia and the ' +
      'Palaeolithic are both legible. Height is on a square-root scale.',
      dateHistogram(rows)),
    card('Period composition', null, null, periodBars(rows)),
    card('Dating method', null,
      'Directly radiocarbon-dated individuals carry far tighter age ' +
      'constraints than those dated by archaeological context alone.',
      datingMethodBar(rows)),
  );
}

function dateHistogram(rows) {
  const W = 520, H = 190, PAD_L = 34, PAD_B = 26, PAD_T = 8;
  const BINS = 64;
  const periods = dict('period');
  const order = dict('periodOrder');

  const bins = Array.from({ length: BINS }, () => new Map());
  let undated = 0;
  for (const i of rows) {
    const bp = col('dateMean')[i];
    if (Number.isNaN(bp)) { undated++; continue; }
    const b = Math.min(BINS - 1, Math.floor(bpToT(bp) * BINS));
    const key = periods[col('period')[i]];
    bins[b].set(key, (bins[b].get(key) || 0) + 1);
  }

  let max = 0;
  for (const m of bins) {
    let t = 0; for (const v of m.values()) t += v;
    max = Math.max(max, t);
  }
  if (!max) return emptyState('No dated individuals in this selection');

  const s = svg(W, H);
  const plotH = H - PAD_B - PAD_T, plotW = W - PAD_L;
  const scale = (v) => Math.sqrt(v / max) * plotH;

  // Recessive gridlines at sensible counts.
  for (const frac of [0.25, 0.5, 1]) {
    const y = PAD_T + plotH - scale(max * frac);
    s.append(node('line', { x1: PAD_L, x2: W, y1: y, y2: y, class: 'grid' }));
    s.append(text(PAD_L - 6, y + 3, compact(Math.round(max * frac)),
      { 'text-anchor': 'end', fill: INK }));
  }

  const bw = plotW / BINS;
  bins.forEach((m, b) => {
    if (!m.size) return;
    // Axis runs deep-past on the left, matching the timeline below the globe.
    const x = PAD_L + (BINS - 1 - b) * bw;
    let total = 0; for (const v of m.values()) total += v;

    const entries = [...m.entries()].sort(
      (a, c) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(c[0]) + 1 || 99));

    let y = PAD_T + plotH;
    for (const [period, count] of entries) {
      const h = scale(count);
      y -= h;
      const rect = bar(x + 0.6, y, Math.max(0.8, bw - 2), h,
        PERIOD_COLORS[period] || NEUTRAL[3], 3);
      const lo = tToBp(b / BINS), hi = tToBp((b + 1) / BINS);
      tip(rect, `<b>${escapeHtml(period)}</b><span>${count.toLocaleString()} individual${count === 1 ? '' : 's'}</span><br>
        <span>${bpToEra(hi)} – ${bpToEra(lo)}</span>`);
      s.append(rect);
      y -= 2;   // 2px surface gap between stacked segments
    }
  });

  // x axis
  s.append(node('line', { x1: PAD_L, x2: W, y1: PAD_T + plotH,
    y2: PAD_T + plotH, class: 'ax' }));
  for (const bp of [0, 3000, 10000, 50000, 500000]) {
    const x = PAD_L + (1 - bpToT(bp)) * plotW;
    s.append(text(x, H - 8, bp === 0 ? 'now' : bpLabel(bp).replace(' BP', ''),
      { 'text-anchor': 'middle', fill: INK }));
  }

  const wrap = el('div', {}, s);
  if (undated) {
    wrap.append(el('div', { class: 'chart-note', style: { marginTop: '6px' },
      text: `${n0(undated)} selected individual${undated === 1 ? '' : 's'} carry no date and are not plotted.` }));
  }
  return wrap;
}

function periodBars(rows) {
  const order = dict('periodOrder');
  const tally = new Map();
  for (const i of rows) {
    const p = dv('period', i);
    tally.set(p, (tally.get(p) || 0) + 1);
  }
  const items = [...tally.entries()]
    .sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99));
  return rankedBars(items, (label) => PERIOD_COLORS[label] || NEUTRAL[3],
    rows.length, { keepOrder: true });
}

function datingMethodBar(rows) {
  let direct = 0;
  for (const i of rows) {
    if (col('flags')[i] & S.manifest.flags.DIRECT_DATE) direct++;
  }
  const contextual = rows.length - direct;
  return frag(
    stackedRow([
      { label: 'Direct ¹⁴C', n: direct, color: CATEGORICAL[0] },
      { label: 'Contextual', n: contextual, color: NEUTRAL[2] },
    ], rows.length),
    legendRow([
      { label: 'Direct radiocarbon', color: CATEGORICAL[0], n: direct },
      { label: 'Contextual / other', color: NEUTRAL[2], n: contextual },
    ]));
}

/** One horizontal 100% stacked bar with 2px gaps. */
function stackedRow(segments, total) {
  const W = 520, H = 16;
  const s = svg(W, H);
  let x = 0;
  const live = segments.filter((seg) => seg.n > 0);
  live.forEach((seg, k) => {
    const w = Math.max(2, (seg.n / total) * W - (k < live.length - 1 ? 2 : 0));
    const r = hbar(x, 0, w, H, seg.color, 4);
    tip(r, `<b>${escapeHtml(seg.label)}</b><span>${n0(seg.n)} · ${
      ((seg.n / total) * 100).toFixed(1)}%</span>`);
    s.append(r);
    x += w + 2;
  });
  return s;
}

/* ═══ Quality ═════════════════════════════════════════════════════════ */

function qualityTab(rows) {
  return frag(
    card('AADR quality assessment', null,
      'Curator verdicts shipped with the release. Anything below Pass should ' +
      'be treated with care in downstream analysis.',
      assessmentChart(rows)),
    card('Mean coverage', null,
      'Log-spaced bins. Coverage below ~0.05× rarely supports more than ' +
      'uniparental haplogroup calls.',
      logHistogram(rows, 'coverage', 0.005, 60, '×')),
    card('SNPs recovered on the 1240k panel', null, null,
      logHistogram(rows, 'snps', 500, 1200000, '')),
    card('Runs of homozygosity', null,
      'Sum of ROH segments longer than 20 cM, from Ringbauer et al. 2021. ' +
      'High values indicate parental relatedness or a small mating pool.',
      rohChart(rows)),
  );
}

function assessmentChart(rows) {
  const tally = new Map();
  for (const i of rows) {
    const a = dv('assessment', i) || 'Unknown';
    tally.set(a, (tally.get(a) || 0) + 1);
  }
  const items = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return frag(
    rankedBars(items, (l) => ASSESSMENT_COLORS[l] || NEUTRAL[3], rows.length,
      { labelFn: (l) => l.replace(/_/g, ' ') }),
    el('div', { class: 'chart-note', style: { marginTop: '8px' },
      text: 'Status colours are reserved and always shown with their label.' }));
}

function logHistogram(rows, column, lo, hi, unit) {
  const W = 520, H = 150, PAD_L = 34, PAD_B = 24, PAD_T = 8;
  const BINS = 40;
  const data = col(column);
  const isInt = column === 'snps';

  const counts = new Int32Array(BINS);
  let missing = 0, maxV = 0;
  const lLo = Math.log10(lo), lHi = Math.log10(hi);
  for (const i of rows) {
    const v = data[i];
    if (Number.isNaN(v) || (isInt && v === 0)) { missing++; continue; }
    const clamped = Math.min(hi, Math.max(lo, v));
    const b = Math.min(BINS - 1,
      Math.floor(((Math.log10(clamped) - lLo) / (lHi - lLo)) * BINS));
    counts[b]++;
    maxV = Math.max(maxV, v);
  }
  const max = Math.max(...counts);
  if (!max) return emptyState('No measurements in this selection');

  const s = svg(W, H);
  const plotH = H - PAD_B - PAD_T, plotW = W - PAD_L;
  const bw = plotW / BINS;

  for (const frac of [0.5, 1]) {
    const y = PAD_T + plotH - (frac * plotH);
    s.append(node('line', { x1: PAD_L, x2: W, y1: y, y2: y, class: 'grid' }));
    s.append(text(PAD_L - 6, y + 3, compact(Math.round(max * frac)),
      { 'text-anchor': 'end', fill: INK }));
  }

  for (let b = 0; b < BINS; b++) {
    if (!counts[b]) continue;
    const h = (counts[b] / max) * plotH;
    const x = PAD_L + b * bw;
    const t = b / (BINS - 1);
    const r = bar(x + 0.6, PAD_T + plotH - h, Math.max(0.8, bw - 2), h,
      rgbToCss(rampColor(0.25 + t * 0.7)), 3);
    const from = 10 ** (lLo + (b / BINS) * (lHi - lLo));
    const to = 10 ** (lLo + ((b + 1) / BINS) * (lHi - lLo));
    tip(r, `<b>${counts[b].toLocaleString()} individuals</b><span>${
      isInt ? compact(from) : from.toPrecision(2)}${unit} – ${
      isInt ? compact(to) : to.toPrecision(2)}${unit}</span>`);
    s.append(r);
  }

  s.append(node('line', { x1: PAD_L, x2: W, y1: PAD_T + plotH,
    y2: PAD_T + plotH, class: 'ax' }));
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    const v = 10 ** (lLo + t * (lHi - lLo));
    s.append(text(PAD_L + t * plotW, H - 7,
      isInt ? compact(v) : (v < 1 ? v.toFixed(2) : v.toFixed(0)) + unit,
      { 'text-anchor': k === 0 ? 'start' : k === 4 ? 'end' : 'middle', fill: INK }));
  }

  const wrap = el('div', {}, s);
  if (missing) {
    wrap.append(el('div', { class: 'chart-note', style: { marginTop: '6px' },
      text: `${n0(missing)} of ${n0(rows.length)} selected individuals have no value recorded for this field.` }));
  }
  return wrap;
}

function rohChart(rows) {
  const bands = [
    { label: 'None detected', lo: 0, hi: 1, color: NEUTRAL[2] },
    { label: 'Background (<50 cM)', lo: 1, hi: 50, color: CATEGORICAL[2] },
    { label: 'Elevated (50–100 cM)', lo: 50, hi: 100, color: STATUS.warning },
    { label: 'Close kin (100–200 cM)', lo: 100, hi: 200, color: STATUS.serious },
    { label: 'First-degree (>200 cM)', lo: 200, hi: Infinity, color: STATUS.critical },
  ];
  const counts = bands.map(() => 0);
  let measured = 0;
  for (const i of rows) {
    const v = col('roh')[i];
    if (Number.isNaN(v)) continue;
    measured++;
    for (let k = 0; k < bands.length; k++) {
      if (v >= bands[k].lo && v < bands[k].hi) { counts[k]++; break; }
    }
  }
  if (!measured) {
    return emptyState('No ROH measurements in this selection',
      'ROH is reported for a subset of the AADR.');
  }
  const segs = bands.map((b, k) => ({ label: b.label, n: counts[k], color: b.color }));
  return frag(
    stackedRow(segs, measured),
    legendRow(segs.filter((s) => s.n > 0)),
    el('div', { class: 'chart-note', style: { marginTop: '7px' },
      text: `${n0(measured)} of ${n0(rows.length)} selected individuals have ROH reported.` }));
}

/* ═══ Geography ═══════════════════════════════════════════════════════ */

function geographyTab(rows) {
  const tallyOf = (column) => {
    const m = new Map();
    for (const i of rows) {
      const v = dv(column, i);
      if (v) m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const sites = new Set();
  for (const i of rows) { const s = col('site')[i]; if (s >= 0) sites.add(s); }

  return frag(
    card('Where the selection comes from',
      `${n0(sites.size)} sites`, null,
      rankedBars(tallyOf('region').slice(0, 12),
        (l) => cladeColor(l), rows.length)),
    card('Countries', null, null,
      rankedBars(tallyOf('country').slice(0, 15),
        () => CATEGORICAL[0], rows.length)),
    card('Cultures', null,
      'Read from AADR Group ID labels; only individuals whose label names a ' +
      'recognised culture appear here.',
      (() => {
        const t = tallyOf('culture');
        return t.length
          ? rankedBars(t.slice(0, 15), () => CATEGORICAL[2], rows.length)
          : emptyState('No culture labels in this selection');
      })()),
  );
}

/* ═══ Haplogroups ═════════════════════════════════════════════════════ */

function haploTab(rows) {
  const tally = (column, sexFilter) => {
    const m = new Map();
    let n = 0;
    for (const i of rows) {
      if (sexFilter && dv('sex', i) !== 'M') continue;
      const v = dv(column, i);
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
      n++;
    }
    return { items: [...m.entries()].sort((a, b) => b[1] - a[1]), n };
  };

  const mt = tally('mtRoot', false);
  const y = tally('yRoot', true);

  return frag(
    card('mtDNA clades', `${n0(mt.n)} called`,
      'Top-level maternal clades. Called for individuals with sufficient ' +
      'mitochondrial coverage.',
      mt.items.length
        ? rankedBars(mt.items.slice(0, 14), cladeColor, mt.n)
        : emptyState('No mtDNA calls in this selection')),
    card('Y clades', `${n0(y.n)} called`,
      'Males only — a Y haplogroup cannot be called for female individuals, ' +
      'so percentages are of called males, not of the whole selection.',
      y.items.length
        ? rankedBars(y.items.slice(0, 14), cladeColor, y.n)
        : emptyState('No Y calls in this selection')),
  );
}

/* ═══ Ordination ══════════════════════════════════════════════════════ */

async function pcaTab() {
  const [mt, yy] = await Promise.all([
    loadPCA('mt').catch(() => null), loadPCA('y').catch(() => null),
  ]);
  if (!mt && !yy) {
    return emptyState('Ordination unavailable', 'Re-run the build pipeline.');
  }

  const wrap = el('div');
  wrap.append(el('div', { class: 'callout info', style: { marginBottom: '14px' } },
    el('b', { text: 'Read this carefully. ' }),
    'This is a PCA of uniparental haplogroup frequencies per population — ' +
    'not a genome-wide genotype PCA. It cannot recover autosomal ancestry ' +
    'and is not comparable to the PCA figures in the ancient-DNA literature. ' +
    'A genotype PCA needs the AADR .geno release and plugs in as a module.'));

  const seg = el('div', { class: 'seg', style: { marginBottom: '14px' } });
  const host = el('div');
  let which = mt ? 'mt' : 'y';

  const draw = () => {
    const data = which === 'mt' ? mt : yy;
    host.replaceChildren(data ? pcaScatter(data) : emptyState('Not computed'));
  };
  for (const [key, label] of [['mt', 'mtDNA'], ['y', 'Y chromosome']]) {
    const btn = el('button', {
      class: key === which ? 'is-on' : '', text: label,
      onclick: () => {
        which = key;
        for (const b of seg.children) b.classList.toggle('is-on', b === btn);
        draw();
      },
    });
    btn.disabled = !(key === 'mt' ? mt : yy);
    seg.append(btn);
  }
  draw();
  wrap.append(seg, host);
  return wrap;
}

function pcaScatter(data) {
  const W = 520, H = 380, PAD = 34;
  const pts = data.points, axes = data.axes;
  const xs = axes.map((a) => a[0]), ys = axes.map((a) => a[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);

  const sx = (v) => PAD + ((v - xMin) / (xMax - xMin || 1)) * (W - PAD - 12);
  const sy = (v) => H - PAD - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD - 16);

  const s = svg(W, H);
  s.append(node('line', { x1: PAD, x2: W - 6, y1: sy(0), y2: sy(0), class: 'grid' }));
  s.append(node('line', { x1: sx(0), x2: sx(0), y1: 12, y2: H - PAD, class: 'grid' }));

  // Colour by the population's modal period, so the ordination can be read
  // against the chronology rather than as an unlabelled cloud.
  const order = dict('periodOrder');
  const seen = new Map();

  const sorted = pts.map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.n - b.p.n);   // draw big populations last

  for (const { p, i } of sorted) {
    const color = PERIOD_COLORS[p.period] || NEUTRAL[3];
    seen.set(p.period, (seen.get(p.period) || 0) + 1);
    const c = node('circle', {
      cx: sx(axes[i][0]), cy: sy(axes[i][1]),
      r: Math.min(9, 2.6 + Math.sqrt(p.n) * 0.42),
      fill: color, 'fill-opacity': 0.82,
      stroke: 'rgba(10,13,20,.85)', 'stroke-width': 2,   // 2px surface ring
    });
    c.setAttribute('class', 'pt');
    const freqs = data.frequencies?.[p.population];
    const top = freqs
      ? Object.entries(freqs).sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([h, f]) => `${h} ${(f * 100).toFixed(0)}%`).join(' · ') : '';
    tip(c, `<b>${escapeHtml(p.population)}</b>
      <span>${escapeHtml(p.period)} · ${escapeHtml(p.region)}</span><br>
      <span>${p.n} individuals${p.median_bp != null ? ` · ${bpToEra(p.median_bp)}` : ''}</span>
      ${top ? `<span class="tt-hint">${escapeHtml(top)}</span>` : ''}`);
    s.append(c);
  }

  const [v1, v2] = data.explained_variance || [0, 0];
  s.append(text(W / 2, H - 8, `PC1 — ${(v1 * 100).toFixed(1)}% of variance`,
    { 'text-anchor': 'middle', fill: INK }));
  const yl = text(0, 0, `PC2 — ${(v2 * 100).toFixed(1)}%`,
    { 'text-anchor': 'middle', fill: INK,
      transform: `translate(11, ${H / 2}) rotate(-90)` });
  s.append(yl);

  const legendItems = [...seen.entries()]
    .sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99))
    .map(([label, n]) => ({ label, n, color: PERIOD_COLORS[label] || NEUTRAL[3] }));

  return el('div', {}, s, legendRow(legendItems),
    el('div', { class: 'chart-note', style: { marginTop: '8px' },
      text: `${data.n_populations} populations with at least ` +
        `${data.min_population_size} called individuals. ${data.method}.` }));
}

/* ═══ Papers ══════════════════════════════════════════════════════════ */

async function papersTab(rows) {
  const pubs = await loadPublications();
  const tally = new Map();
  for (const i of rows) {
    const pi = col('publication')[i];
    if (pi !== 65535) tally.set(pi, (tally.get(pi) || 0) + 1);
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  if (!ranked.length) return emptyState('No publications for this selection');

  const wrap = el('div');
  wrap.append(el('div', { class: 'chart-sub' },
    `${tally.size} publications contribute to the current selection.`));

  const max = ranked[0][1];
  for (const [pi, n] of ranked) {
    const p = pubs[pi];
    if (!p) continue;
    wrap.append(el('div', {
      style: { padding: '10px 0', borderBottom: '1px solid var(--glass-line2)' },
    },
      el('div', { style: { display: 'flex', gap: '10px',
        alignItems: 'baseline', marginBottom: '4px' } },
        el('a', {
          href: p.links?.doi || p.links?.scholar || '#',
          target: '_blank', rel: 'noopener noreferrer',
          style: { flex: '1 1 auto', fontSize: '12.4px', color: 'var(--ink)',
            textDecoration: 'none', lineHeight: '1.45' },
        }, p.title || p.abbrev),
        el('b', { style: { fontSize: '12px', fontVariantNumeric: 'tabular-nums',
          color: 'var(--ink-2)' }, text: n0(n) })),
      el('div', { class: 'chart-note', style: { marginBottom: '5px' },
        text: [p.authors?.[0], p.journal, p.year].filter(Boolean).join(' · ') +
          (p.citations != null ? ` · ${n0(p.citations)} citations` : '') }),
      (() => {
        const s = svg(520, 5);
        s.append(hbar(0, 0, Math.max(2, (n / max) * 520), 5, CATEGORICAL[0], 2.5));
        return s;
      })()));
  }
  return wrap;
}

/* ═══ Modules ═════════════════════════════════════════════════════════ */

function modulesTab() {
  return modules.renderCatalogue();
}

/* ═══ shared: ranked horizontal bars ══════════════════════════════════ */

function rankedBars(items, colorFn, total, { labelFn = (x) => x,
  keepOrder = false } = {}) {
  if (!items.length) return emptyState('Nothing to show');
  const rows = keepOrder ? items : [...items].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((r) => r[1]));

  const wrap = el('div');
  for (const [label, n] of rows) {
    const color = colorFn(label);
    const s = svg(520, 7);
    const r = hbar(0, 0, Math.max(2, (n / max) * 520), 7, color, 3.5);
    tip(r, `<b>${escapeHtml(labelFn(label))}</b><span>${n0(n)} · ${
      ((n / total) * 100).toFixed(1)}% of selection</span>`);
    s.append(r);

    wrap.append(el('div', { class: 'bar-row', style: { marginBottom: '8px' } },
      el('span', { class: 'bar-label', text: labelFn(label),
        title: labelFn(label), style: { width: '112px' } }),
      el('span', { style: { flex: '1 1 auto' } }, s),
      el('span', { class: 'bar-n', text: compact(n) })));
  }
  return wrap;
}
