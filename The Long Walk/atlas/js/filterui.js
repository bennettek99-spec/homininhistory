/**
 * Filter panel rendering.
 *
 * Option lists are rebuilt on every filter change so their counts stay live,
 * but only for groups the user has actually expanded -- rendering 3,900
 * population checkboxes that nobody has opened is the one thing here that
 * would actually be slow.
 */

import * as filters from './filters.js';
import { dict } from './store.js';
import {
  PERIOD_COLORS, SUBSISTENCE_COLORS, SEX_COLORS, ASSESSMENT_COLORS,
  cladeColor, compact, n0, NEUTRAL,
} from './format.js';
import { $, el, icon, ICONS, raf, debounce } from './ui.js';

const SWATCHES = {
  period: (l) => PERIOD_COLORS[l] || NEUTRAL[3],
  subsistence: (l) => SUBSISTENCE_COLORS[l] || NEUTRAL[3],
  sex: (l) => SEX_COLORS[l] || NEUTRAL[3],
  assessment: (l) => ASSESSMENT_COLORS[l] || NEUTRAL[3],
  mtRoot: cladeColor,
  yRoot: cladeColor,
  region: cladeColor,
};

const SEX_LABELS = { M: 'Male', F: 'Female', U: 'Undetermined' };

const open = new Set(['period', 'region']);
const searchText = new Map();
let root, railN, railSites;

export function init() {
  root = $('#filter-body');
  railN = $('#rail-n');
  railSites = $('#rail-sites');

  build();
  $('#btn-reset').addEventListener('click', () => {
    searchText.clear();
    filters.reset();
    build();
  });
  filters.onChange(refresh);
}

/* ── construction ────────────────────────────────────────────────────── */

function build() {
  root.replaceChildren();
  root.append(togglesGroup());
  for (const facet of filters.FACETS) root.append(facetGroup(facet));
  for (const range of filters.RANGES) root.append(rangeGroup(range));
  refreshNow(filters.current());
}

function group(key, title, bodyNode, countFn) {
  const isOpen = open.has(key);
  const head = el('button', {
    class: 'fg-head',
    'aria-expanded': String(isOpen),
    onclick: () => {
      if (open.has(key)) open.delete(key); else open.add(key);
      wrap.classList.toggle('open', open.has(key));
      head.setAttribute('aria-expanded', String(open.has(key)));
      if (open.has(key)) refreshNow(filters.current());
    },
  },
    el('span', { class: 'fg-title', text: title }),
    el('span', { class: 'fg-count', dataset: { count: key }, hidden: true }),
    icon(ICONS.chevron, 13));
  head.querySelector('svg').classList.add('fg-chev');

  const wrap = el('div', { class: `fgroup${isOpen ? ' open' : ''}` },
    head, el('div', { class: 'fg-body' }, bodyNode));
  wrap.dataset.group = key;
  return wrap;
}

function togglesGroup() {
  const bodyNode = el('div');
  for (const t of filters.TOGGLES) {
    const input = el('input', {
      type: 'checkbox', id: `tog-${t.key}`,
      onchange: (e) => filters.setToggle(t.key, e.target.checked),
    });
    input.checked = filters.state.toggles[t.key];
    bodyNode.append(el('label', { class: 'lrow', for: `tog-${t.key}`,
      style: { padding: '7px 4px' } },
      el('div', { class: 'lrow-t' },
        el('b', { text: t.label }),
        t.note && el('span', { text: t.note })),
      input, el('span', { class: 'switch' })));
  }
  open.add('toggles');
  return group('toggles', 'Data selection', bodyNode);
}

function facetGroup(facet) {
  const bodyNode = el('div');

  if (facet.searchable) {
    bodyNode.append(el('input', {
      class: 'fg-search', type: 'search', placeholder: `Filter ${facet.label.toLowerCase()}…`,
      oninput: debounce((e) => {
        searchText.set(facet.key, e.target.value.trim().toLowerCase());
        paintFacet(facet);
      }, 120),
    }));
  }
  bodyNode.append(el('div', { class: 'fg-list', dataset: { list: facet.key } }));
  return group(facet.key, facet.label, bodyNode);
}

function rangeGroup(spec) {
  const current = filters.state.ranges[spec.key] || [spec.min, spec.max];

  const readout = el('div', { class: 'frange-top' },
    el('span', {}, el('b', { dataset: { rlo: spec.key } }), ' — ',
      el('b', { dataset: { rhi: spec.key } })),
    el('span', { dataset: { rn: spec.key } }));

  // Sliders operate on a normalised 0-1000 track; a log-scaled field maps that
  // track through a power curve so the low end, where the data actually lives,
  // gets most of the travel.
  const toTrack = (v) => spec.log
    ? Math.round(Math.sqrt(Math.max(0, v - spec.min) / (spec.max - spec.min)) * 1000)
    : Math.round(((v - spec.min) / (spec.max - spec.min)) * 1000);
  const fromTrack = (t) => spec.log
    ? spec.min + ((t / 1000) ** 2) * (spec.max - spec.min)
    : spec.min + (t / 1000) * (spec.max - spec.min);

  const lo = el('input', { type: 'range', min: 0, max: 1000, value: toTrack(current[0]) });
  const hi = el('input', { type: 'range', min: 0, max: 1000, value: toTrack(current[1]) });
  const fill = el('div', { class: 'dual-fill' });

  const apply = raf(() => {
    let a = Number(lo.value), b = Number(hi.value);
    if (a > b) { const t = a; a = b; b = t; }
    fill.style.left = `${a / 10}%`;
    fill.style.width = `${(b - a) / 10}%`;
    filters.setRange(spec.key, fromTrack(a), fromTrack(b));
  });
  lo.addEventListener('input', apply);
  hi.addEventListener('input', apply);

  const dual = el('div', { class: 'dual' },
    el('div', { class: 'dual-track' }), fill, lo, hi);
  const initA = toTrack(current[0]), initB = toTrack(current[1]);
  fill.style.left = `${initA / 10}%`;
  fill.style.width = `${(initB - initA) / 10}%`;

  const bodyNode = el('div', { class: 'frange' }, readout, dual,
    spec.key === 'roh' && el('div', { class: 'fnote',
      text: 'Reported for a subset of the AADR. Constraining this range ' +
            'excludes individuals with no ROH measurement.' }));
  bodyNode.dataset.range = spec.key;
  bodyNode._fromTrack = fromTrack;
  return group(spec.key, spec.label, bodyNode);
}

/* ── live updates ────────────────────────────────────────────────────── */

/**
 * Painted directly on first build and after programmatic selection, and
 * rAF-coalesced when driven by the filter stream. The initial paint must not
 * wait for a frame: a page opened in a background tab gets no frames at all,
 * and would sit there showing em-dashes until it was focused.
 */
function refreshNow(result = filters.current()) {
  railN.textContent = n0(result.n);
  railSites.textContent = n0(result.nSites);
  $('#count-n').textContent = n0(result.n);

  for (const facet of filters.FACETS) {
    const badge = root.querySelector(`[data-count="${facet.key}"]`);
    const active = filters.activeCount(facet.key);
    if (badge) {
      badge.hidden = active === 0;
      badge.textContent = String(active);
    }
    if (open.has(facet.key)) paintFacet(facet);
  }

  for (const spec of filters.RANGES) {
    const range = filters.state.ranges[spec.key];
    const [a, b] = range || [spec.min, spec.max];
    const fmt = (v) => spec.key === 'snps' ? compact(v)
      : `${v < 10 ? v.toFixed(1) : Math.round(v)}${spec.unit}`;
    const loEl = root.querySelector(`[data-rlo="${spec.key}"]`);
    const hiEl = root.querySelector(`[data-rhi="${spec.key}"]`);
    const nEl = root.querySelector(`[data-rn="${spec.key}"]`);
    if (loEl) loEl.textContent = fmt(a);
    if (hiEl) hiEl.textContent = fmt(b);
    if (nEl) nEl.textContent = range ? 'filtering' : 'all';
    const badge = root.querySelector(`[data-count="${spec.key}"]`);
    if (badge) { badge.hidden = !range; badge.textContent = '1'; }
  }
}

const refresh = raf(refreshNow);

function paintFacet(facet) {
  const list = root.querySelector(`[data-list="${facet.key}"]`);
  if (!list) return;

  const q = searchText.get(facet.key) || '';
  let options = filters.facetOptions(facet.key, { limit: 500 });
  if (q) options = options.filter((o) => o.label.toLowerCase().includes(q));

  // Long tails are cut, but never so as to hide something already selected.
  const CAP = facet.searchable ? 120 : 40;
  const shown = options.slice(0, CAP);
  const hiddenSelected = options.slice(CAP).filter((o) => o.selected);
  const rows = [...shown, ...hiddenSelected];

  list.replaceChildren();
  if (!rows.length) {
    list.append(el('div', { class: 'chart-note', style: { padding: '8px 4px' },
      text: q ? 'No match' : 'Nothing available' }));
    return;
  }

  const swatch = SWATCHES[facet.key];
  for (const o of rows) {
    const label = facet.key === 'sex' ? (SEX_LABELS[o.label] || o.label)
      : o.label.replace(/_/g, ' ');
    const input = el('input', {
      type: 'checkbox',
      onchange: () => filters.toggleFacet(facet.key, o.index),
    });
    input.checked = o.selected;

    list.append(el('label', {
      class: `opt${o.count === 0 && !o.selected ? ' is-zero' : ''}`,
      title: `${label} — ${n0(o.count)}`,
    },
      input,
      el('span', { class: 'opt-box' }, icon(ICONS.check, 9)),
      swatch && el('span', { class: 'opt-swatch',
        style: { background: swatch(o.label) } }),
      el('span', { class: 'opt-label', text: label }),
      el('span', { class: 'opt-n', text: compact(o.count) })));
  }

  if (options.length > rows.length) {
    list.append(el('div', { class: 'chart-note', style: { padding: '7px 4px' },
      text: `+${options.length - rows.length} more — type to narrow` }));
  }
}

/** Programmatic selection, used by search and story mode. */
export function selectValue(facetKey, label) {
  const facet = filters.FACETS.find((f) => f.key === facetKey);
  if (!facet) return false;
  const idx = dict(facet.column).indexOf(label);
  if (idx < 0) return false;
  filters.setFacet(facetKey, [idx]);
  open.add(facetKey);
  const wrap = root.querySelector(`[data-group="${facetKey}"]`);
  wrap?.classList.add('open');
  refreshNow(filters.current());
  return true;
}
