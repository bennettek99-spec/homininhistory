/**
 * Bootstrap.
 *
 * Load order matters: the columnar core comes first because nothing can render
 * without it, then the globe paints, and everything else (sites, publications,
 * ordinations, the search index, analysis modules) streams in behind the first
 * frame. The app is usable before those finish.
 */

import * as store from './store.js';
import * as filters from './filters.js';
import * as filterui from './filterui.js';
import * as globe from './globe.js';
import * as timeline from './timeline.js';
import * as search from './search.js';
import * as panels from './panels.js';
import * as charts from './charts.js';
import * as story from './story.js';
import * as compare from './compare.js';
import * as exporters from './exports.js';
import * as modules from './modules.js';
import {
  PERIOD_COLORS, SEQUENTIAL, NEUTRAL, n0, compact, bpToEra,
} from './format.js';
import {
  $, $$, el, icon, ICONS, toast, showTip, hideTip, raf, popoverGroup, emptyState,
} from './ui.js';
import { initMobile, isPhone, suppressHoverTip } from './mobile.js';

/* ── boot ────────────────────────────────────────────────────────────── */

const bootEl = $('#boot');
const bootFill = $('#boot-fill');
const bootStep = $('#boot-step');

function progress(fraction, message) {
  bootFill.style.width = `${Math.round(fraction * 100)}%`;
  if (message) bootStep.textContent = message;
}

function bootFail(err) {
  const box = $('#boot-err');
  box.hidden = false;
  const isFile = location.protocol === 'file:';
  box.innerHTML = isFile
    ? '<b>This page must be served over HTTP.</b><br>Opening it directly from ' +
      'the filesystem blocks ES modules and data fetches. Run ' +
      '<code>python serve.py</code> from the project folder and open the ' +
      'address it prints.'
    : `<b>Could not start.</b><br>${String(err?.message || err)}` +
      '<br><br>If <code>data/manifest.json</code> is missing, run ' +
      '<code>python pipeline/fetch_aadr.py</code> then ' +
      '<code>python pipeline/build.py</code>.';
  bootStep.textContent = 'Failed to load';
  console.error(err);
}

async function main() {
  try {
    await store.loadCore(progress);
  } catch (err) {
    bootFail(err);
    return;
  }

  progress(0.92, 'Building interface');
  filters.init();

  // Restore a shared view before the first render so the globe never flashes
  // the unfiltered dataset on the way to the intended one.
  if (location.hash) {
    try { filters.fromHash(location.hash); } catch { /* ignore a bad hash */ }
  }

  initGlobe();
  filterui.init();
  timeline.init();
  charts.init();
  panels.init({
    onFocus: (i) => globe.setHighlight(i),
    onFocusSite: (site) => globe.flyTo(site.lat, site.lon, 8),
    onClose: () => globe.setHighlight(null),
    onCompare: (i) => compare.add(i),
  });
  compare.init();
  story.init({
    onChapter: (ch) => {
      if (ch.view) globe.flyTo(ch.view.lat, ch.view.lon, ch.view.zoom, 2100);
    },
    onEnd: () => globe.home(),
  });
  search.init({ onSelect: onSearchSelect });

  initChrome();
  filters.onChange(onFilterChange);
  onFilterChange(filters.current());
  renderLegendNow();

  progress(1, 'Ready');
  setTimeout(() => bootEl.classList.add('done'), 340);

  // Everything below is optional enrichment; failures degrade rather than break.
  store.loadSites().catch(() => {});
  store.loadPublications().catch(() => {});
  store.loadSummary().then(renderAbout).catch(() => {});
  store.loadArcs().then((arcs) => globe.setArcs(arcs)).catch(() => {});
  modules.discover().catch(() => {});
}

/* ── globe ───────────────────────────────────────────────────────────── */

function initGlobe() {
  const deckInstance = globe.init($('#deck-canvas'), {
    onPick: onGlobePick,
    onHover: onGlobeHover,
    onViewChange: raf(() => { /* reserved for a future scale bar */ }),
  });
  // exports.js needs the instance to force a redraw before reading the canvas.
  window.__deck = deckInstance;
  drawStars();
}

function onGlobePick(cluster) {
  if (!cluster) return;
  if (cluster.n === 1) {
    panels.showIndividual(cluster.row);
  } else if (cluster.n <= 24 && globe.getView().zoom > 5.5) {
    // Tight group at high zoom: the site panel is more useful than zooming.
    const site = store.S.col.site[cluster.rows[0]];
    if (site >= 0) panels.showSite(site);
    else globe.frameRows(cluster.rows);
  } else {
    globe.frameRows(cluster.rows, { maxZoom: 9 });
  }
}

const onGlobeHover = (info) => {
  if (suppressHoverTip()) return;
  if (!info) { hideTip(); return; }
  if (info.kind === 'arc') {
    showTip(`<b>${info.arc.name}</b><span>${info.arc.period} · ` +
      `${bpToEra(info.arc.start_bp)} – ${bpToEra(info.arc.end_bp)}</span>` +
      `<span class="tt-hint">${info.arc.source}</span>`, info.x, info.y);
    return;
  }
  showTip(globe.describeCluster(info.cluster, store.idOf), info.x, info.y);
};

/* ── starfield ───────────────────────────────────────────────────────── */

/**
 * Static starfield on its own canvas, painted once per resize. Animating it
 * would compete with the globe for frame budget and add nothing: real stars do
 * not twinkle at this angular scale.
 */
function drawStars() {
  const canvas = $('#starfield');
  const paint = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = Math.round((w * h) / 5200);
    for (let k = 0; k < n; k++) {
      const x = Math.random() * w, y = Math.random() * h;
      const r = Math.random() ** 2.6 * 1.25 + 0.18;
      const a = 0.16 + Math.random() ** 1.7 * 0.6;
      // A slight blue/warm split reads as stellar colour without being obvious.
      const warm = Math.random() > 0.82;
      ctx.fillStyle = warm
        ? `rgba(255,236,208,${a})` : `rgba(206,224,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  paint();
  window.addEventListener('resize', raf(paint));
}

/* ── chrome ──────────────────────────────────────────────────────────── */

function initChrome() {
  popoverGroup([
    [$('#layers'), $('#btn-layers')],
    [$('#story'), $('#btn-story')],
  ]);

  buildLayersPanel();
  buildExportMenu();

  $('#btn-charts').addEventListener('click', () => {
    if (charts.isOpen()) $('#charts').hidden = true; else charts.open();
  });
  $('#btn-home').addEventListener('click', () => globe.home());
  $('#btn-zin').addEventListener('click', () => globe.zoomBy(0.9));
  $('#btn-zout').addEventListener('click', () => globe.zoomBy(-0.9));
  $('#btn-2d').addEventListener('click', (e) => {
    globe.setFlat(!globe.isFlat());
    e.currentTarget.classList.toggle('is-on', globe.isFlat());
  });

  $('#brand').addEventListener('click', () => { $('#about').hidden = false; });
  $('#btn-about-close').addEventListener('click', () => { $('#about').hidden = true; });
  $('#about').addEventListener('click', (e) => {
    if (e.target.id === 'about') $('#about').hidden = true;
  });

  // Mobile: the filter rail is a sheet.
  const rail = $('#rail');
  if (isPhone()) rail.hidden = true;
  $('#btn-filters-m').addEventListener('click', () => {
    rail.hidden = !rail.hidden;
  });
  $('#btn-rail-close').addEventListener('click', () => { rail.hidden = true; });

  initMobile({
    onCloseDetail: () => panels.close(),
    onCloseCharts: () => { $('#charts').hidden = true; },
  });

  // Legend
  $('#lg-mode').addEventListener('change', (e) => {
    globe.setColorMode(e.target.value);
    renderLegend();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      if (!$('#about').hidden) $('#about').hidden = true;
      else if (panels.isOpen()) panels.close();
      else if (charts.isOpen()) $('#charts').hidden = true;
    } else if (e.key === 'a' || e.key === 'A') {
      charts.isOpen() ? ($('#charts').hidden = true) : charts.open();
    } else if (e.key === 'f' || e.key === 'F') {
      $('#rail').hidden = !$('#rail').hidden;
    }
  });

  // Modules cannot import the panel module (it would be a cycle), so they ask
  // for navigation by event instead.
  window.addEventListener('aadr:show-individual', (e) => {
    const row = e.detail?.row;
    if (Number.isInteger(row)) panels.showIndividual(row);
  });

  // Keep the shareable URL current without spamming history entries.
  filters.onChange(raf(() => {
    const hash = filters.toHash();
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname);
  }));
}

function buildLayersPanel() {
  const host = $('#layers-body');
  host.replaceChildren();

  host.append(el('div', { class: 'lgroup-h', text: 'Imagery' }));
  const seg = el('div', { class: 'seg' });
  for (const [key, bm] of Object.entries(globe.BASEMAPS)) {
    const btn = el('button', {
      class: key === 'satellite' ? 'is-on' : '',
      text: bm.label, title: bm.note,
      onclick: () => {
        globe.setOption('basemap', key);
        for (const b of seg.children) b.classList.toggle('is-on', b === btn);
        $('#basemap-note').textContent = bm.note;
      },
    });
    seg.append(btn);
  }
  host.append(seg);
  host.append(el('div', { class: 'fnote', id: 'basemap-note',
    text: globe.BASEMAPS.satellite.note }));

  host.append(el('div', { class: 'lgroup-h', text: 'Overlays' }));
  const toggles = [
    ['borders', 'Country outlines', 'Modern political boundaries'],
    ['heatmap', 'Sample density', 'Where sampling is concentrated — not where people were'],
    ['arcs', 'Migration overlays', 'Literature-derived dispersals, not computed from this data'],
    ['glow', 'Point glow', 'Soft halo under each marker'],
    ['spin', 'Idle rotation', 'Rotate when idle'],
  ];
  for (const [key, label, note] of toggles) {
    const input = el('input', {
      type: 'checkbox', id: `lay-${key}`,
      onchange: (e) => globe.setOption(key, e.target.checked),
    });
    input.checked = globe.options()[key];
    host.append(el('label', { class: 'lrow', for: `lay-${key}` },
      el('div', { class: 'lrow-t' }, el('b', { text: label }),
        el('span', { text: note })),
      input, el('span', { class: 'switch' })));
  }

  host.append(el('div', { class: 'callout', style: { marginTop: '12px' } },
    el('b', { text: 'Palaeo-coastlines. ' }),
    'Sea-level and ice-extent reconstruction needs a bathymetry grid, which ' +
    'this build does not ship. It is a natural fit for the module API.'));
}

function buildExportMenu() {
  const btn = $('#btn-export');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const existing = $('#export-menu');
    if (existing) { existing.remove(); return; }

    const menu = el('div', { class: 'glass popover', id: 'export-menu',
      style: { width: '260px', top: '70px', right: '14px' } },
      el('div', { class: 'pop-head' }, el('h3', { text: 'Export selection' })),
      el('div', { class: 'pop-body' },
        el('div', { class: 'chart-note', style: { marginBottom: '10px' } },
          `${n0(filters.current().n)} individuals match the current filters.`),
        ...[
          ['CSV table', 'Flat table of the selected individuals', exporters.exportCSV],
          ['GeoJSON', 'Mapped individuals as point features', exporters.exportGeoJSON],
          ['Full JSON', 'Every field, including free text (max 4,000)', exporters.exportFullJSON],
          ['Globe as PNG', 'Snapshot with provenance caption', exporters.exportPNG],
        ].map(([label, note, fn]) =>
          el('div', { class: 'lrow', onclick: () => { menu.remove(); fn(); } },
            el('div', { class: 'lrow-t' },
              el('b', { text: label }), el('span', { text: note }))))));

    document.body.append(menu);
    menu.addEventListener('click', (ev) => ev.stopPropagation());
    setTimeout(() => document.addEventListener('click',
      () => menu.remove(), { once: true }), 0);
  });
}

/* ── legend ──────────────────────────────────────────────────────────── */

function renderLegendNow() {
  const host = $('#hud-legend');
  const items = $('#lg-items');
  const data = globe.legend();

  host.classList.add('show');
  items.replaceChildren();

  if (data.kind === 'ramp') {
    $('#lg-title').textContent = data.title;
    items.append(
      el('div', { style: { width: '100%' } },
        el('div', { class: 'lg-ramp', style: {
          background: `linear-gradient(90deg, ${SEQUENTIAL.join(',')})` } }),
        el('div', { class: 'lg-ramp-lab' },
          el('span', { text: data.min }), el('span', { text: data.max }))));
    return;
  }

  $('#lg-title').textContent = data.ordinal
    ? 'Period — lighter is older' : 'Legend';

  for (const item of data.items) {
    items.append(el('span', {
      class: `lg-item${item.off ? ' off' : ''}`,
      title: `${item.label} — ${n0(item.n)} individuals. Click to isolate.`,
      onclick: () => { globe.toggleCategory(item.label); renderLegend(); },
    },
      el('span', { class: 'lg-sw',
        style: { background: item.color, color: item.color } }),
      `${item.label} ${compact(item.n)}`));
  }

  if (data.note) {
    items.append(el('span', {
      style: { fontSize: '10px', color: 'var(--ink-4)', width: '100%',
        marginTop: '4px' },
      text: data.note,
    }));
  }
}

const renderLegend = raf(renderLegendNow);

/* ── reactions ───────────────────────────────────────────────────────── */

function onFilterChange(result) {
  globe.setRows(result.rows);
  renderLegend();
}

function onSearchSelect(entry) {
  switch (entry.kind) {
    case 'individual': {
      const i = entry.ref;
      panels.showIndividual(i);
      const lat = store.col('lat')[i];
      if (!Number.isNaN(lat)) globe.flyTo(lat, store.col('lon')[i], 7);
      break;
    }
    case 'site':
      panels.showSite(entry.ref);
      break;
    case 'population':
      if (filterui.selectValue('population', entry.label)) {
        globe.frameRows(filters.current().rows);
        toast(`Filtered to ${entry.label}`);
      }
      break;
    case 'culture':
      if (filterui.selectValue('culture', entry.label)) {
        globe.frameRows(filters.current().rows);
        toast(`Filtered to ${entry.label}`);
      }
      break;
    case 'country':
      if (filterui.selectValue('country', entry.label)) {
        globe.frameRows(filters.current().rows);
      }
      break;
    case 'region':
      if (filterui.selectValue('region', entry.label)) {
        globe.frameRows(filters.current().rows);
      }
      break;
    case 'period':
      if (filterui.selectValue('period', entry.label)) {
        globe.frameRows(filters.current().rows);
      }
      break;
    case 'haplogroup': {
      const key = entry.ref.type === 'mt' ? 'mtRoot' : 'yRoot';
      if (filterui.selectValue(key, entry.ref.value)) {
        $('#lg-mode').value = key;
        globe.setColorMode(key);
        renderLegend();
        toast(`Filtered to ${entry.ref.type === 'mt' ? 'mtDNA' : 'Y'} clade ${entry.ref.value}`);
      }
      break;
    }
    case 'publication': {
      const label = entry.alias || entry.label;
      store.loadPublications().then((pubs) => {
        const pub = pubs[entry.ref];
        if (!pub) return;
        // Publications are not a facet column; select by row scan instead.
        const rows = [];
        const pubCol = store.col('publication');
        for (let i = 0; i < store.S.n; i++) {
          if (pubCol[i] === pub.id) rows.push(i);
        }
        filters.reset();
        filters.pinRows(rows);
        globe.frameRows(filters.current().rows);
        charts.open();
        toast(`${n0(rows.length)} individuals from ${pub.abbrev}`);
      });
      break;
    }
    default:
      break;
  }
}

/* ── about sheet ─────────────────────────────────────────────────────── */

function renderAbout(summary) {
  const host = $('#about-body');
  const m = store.S.manifest;

  host.replaceChildren(
    el('div', { class: 'stat-grid' },
      ...[
        [n0(summary.n_individuals), 'individuals'],
        [n0(summary.n_georeferenced), 'georeferenced'],
        [n0(summary.n_sites), 'sites'],
        [n0(summary.n_publications), 'publications'],
        [n0(summary.n_countries), 'countries'],
        [n0(summary.n_direct_dated), 'directly ¹⁴C dated'],
      ].map(([v, k]) => el('div', { class: 'metric' },
        el('div', { class: 'metric-v', text: v }),
        el('div', { class: 'metric-k', text: k })))),

    el('h3', { text: 'What this is' }),
    el('p', {}, 'An interactive atlas of the ',
      el('a', { href: 'https://doi.org/10.7910/DVN/FFIDCW', target: '_blank',
        rel: 'noopener noreferrer' }, 'Allen Ancient DNA Resource'),
      ` (release ${m.release}) — every individual in the compendium placed in `,
      'space, time and genetic context. Nothing on this globe is simulated: ',
      'every point is a real published sample with a real date and real ',
      'coordinates.'),

    el('h3', { text: 'What the data does and does not contain' }),
    el('p', {}, 'The AADR ',
      el('code', { text: '.anno' }),
      ' table carries dates, coordinates, coverage, SNP counts, uniparental ' +
      'haplogroups, ROH, contamination estimates and QC verdicts. It carries ' +
      'no genotypes — and therefore no ancestry proportions, no PCA ' +
      'coordinates, no ADMIXTURE components and no archaic-ancestry ' +
      'percentages. This explorer does not estimate them. Where the interface ' +
      'would naturally show them, it says they are absent and points at the ' +
      'module that could supply them.'),

    el('h3', { text: 'Derived fields' }),
    el('p', {}, 'Macro-region, archaeological period, culture and subsistence ' +
      'are derived by the build pipeline from the AADR Group ID and ' +
      'coordinates — they are not AADR columns. Every one of them is tagged ' +
      'in the detail panel with how it was determined, so a derived value is ' +
      'never mistaken for a measured one. Subsistence in particular is a ' +
      'label-keyword inference and should be treated as a browsing aid, not ' +
      'as evidence.'),

    el('h3', { text: 'Ordination' }),
    el('p', {}, 'The PCA in the Analytics panel is computed on uniparental ' +
      'haplogroup frequencies per population, using a Hellinger transform and ' +
      'an SVD. It is a real analysis of real data, and it is not a ' +
      'genome-wide genotype PCA — it cannot recover autosomal ancestry and is ' +
      'not comparable to the PCA figures in the literature.'),

    el('h3', { text: 'Citation' }),
    el('p', {}, 'If you use anything from this atlas, cite the AADR itself: ',
      el('i', {}, 'Mallick S, Micco A, Mah M, et al. (2024) The Allen Ancient ' +
        'DNA Resource (AADR): A curated compendium of ancient human genomes. ' +
        'Scientific Data 11:182.'),
      ' Individual samples additionally carry their own source publication, ' +
      'linked in every detail panel.'),

    el('h3', { text: 'Keyboard' }),
    el('ul', {},
      el('li', {}, el('code', { text: '/' }), ' — search'),
      el('li', {}, el('code', { text: 'A' }), ' — analytics panel'),
      el('li', {}, el('code', { text: 'F' }), ' — filters'),
      el('li', {}, el('code', { text: 'Esc' }), ' — close the top panel'),
      el('li', {}, el('code', { text: '← →' }), ' — step through a guided tour')),

    el('h3', { text: 'Build' }),
    el('p', {}, `Built ${m.built_at} from ${m.source_file}. `,
      `Core payload ${(m.stride * m.n_individuals / 1e6).toFixed(2)} MB ` +
      `across ${m.columns.length} columns; detail records are fetched on ` +
      `demand in ${m.n_shards} shards.`),

    el('p', { style: { marginTop: '18px', fontSize: '11.5px',
      color: 'var(--ink-4)' } },
      'Imagery: Esri World Imagery / CARTO. Boundaries: Natural Earth via ' +
      'world-atlas. Bibliographic metadata: Crossref.'),
  );
}

main();
