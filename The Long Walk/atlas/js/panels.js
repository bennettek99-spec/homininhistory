/**
 * Detail panels for individuals and sites.
 *
 * Every value rendered here comes from a named AADR column, and every value the
 * pipeline *derived* rather than read is tagged with its provenance, so a
 * reader can always tell a measurement from an inference. Fields the AADR does
 * not carry are shown as absent rather than filled in.
 */

import {
  S, dv, col, getDetail, siteOf, publicationOf, membersOfSite,
  loadSites, loadPublications, idOf, prefetchDetails,
} from './store.js';
import {
  PERIOD_COLORS, SUBSISTENCE_COLORS, SEX_COLORS, ASSESSMENT_COLORS,
  cladeColor, n0, n1, n2, compact, bpToEra, bpLabel, rangeLabel, dateFull,
  coordLabel, escapeHtml, haversine,
} from './format.js';
import { $, el, frag, icon, ICONS, skeleton, emptyState, toast } from './ui.js';
import * as modules from './modules.js';

let panel, body, title, sub, addBtn;
let handlers = {};
let currentRow = null;
let currentSite = null;

export function init(callbacks = {}) {
  handlers = callbacks;
  panel = $('#detail');
  body = $('#detail-body');
  title = $('#detail-title');
  sub = $('#detail-sub');
  addBtn = $('#btn-compare-add');

  $('#btn-detail-close').addEventListener('click', close);
  addBtn.addEventListener('click', () => {
    if (currentRow != null) handlers.onCompare?.(currentRow);
  });
}

export function close() {
  panel.hidden = true;
  currentRow = null;
  currentSite = null;
  handlers.onClose?.();
}

export const isOpen = () => !panel.hidden;
export const openRow = () => currentRow;

/* ══ individual ═══════════════════════════════════════════════════════ */

export async function showIndividual(i) {
  if (!Number.isInteger(i) || i < 0 || i >= S.n) {
    toast('No such individual in this release');
    return;
  }
  currentRow = i;
  currentSite = null;
  panel.hidden = false;
  addBtn.hidden = false;
  panel.scrollTop = 0;

  const period = dv('period', i);
  title.textContent = idOf(i);
  sub.textContent = `${dv('population', i) || 'no group label'}`;
  body.replaceChildren(skeleton(9));

  handlers.onFocus?.(i);

  let d;
  try {
    d = await getDetail(i);
  } catch (err) {
    body.replaceChildren(emptyState('Could not load this record',
      String(err.message || err)));
    return;
  }
  if (currentRow !== i) return;      // user moved on while we were fetching
  if (!d) {
    body.replaceChildren(emptyState('No detail record for this individual'));
    return;
  }

  title.textContent = d.id;
  sub.textContent = [d.group, d.locality].filter(Boolean).join(' · ') || '—';

  const [sites, pubs] = await Promise.all([
    loadSites().catch(() => null), loadPublications().catch(() => null),
  ]);
  if (currentRow !== i) return;

  body.replaceChildren(frag(
    heroFor(d, period),
    contextSection(d),
    datingSection(d),
    biologySection(d),
    qualitySection(d),
    ancestrySection(d, i),
    publicationSection(d, pubs),
    relatedSection(d, i, sites),
    modules.renderFor(d, i),
  ));
  animateBars(body);
}

function heroFor(d, period) {
  const color = PERIOD_COLORS[period] || '#5a6273';
  const chips = [];

  if (period && period !== 'Unknown') {
    chips.push(chip(period, 'dot', color));
  }
  if (d.culture) chips.push(chip(d.culture, 'accent'));
  if (d.subsistence) {
    chips.push(chip(d.subsistence, 'dot', SUBSISTENCE_COLORS[d.subsistence]));
  }
  if (d.directDate) chips.push(chip('¹⁴C direct date', 'good'));
  if (d.assessment) {
    const cls = /CRITICAL/.test(d.assessment) ? 'warn'
      : /Questionable/i.test(d.assessment) ? '' : 'good';
    chips.push(chip(d.assessment.replace(/_/g, ' '), cls));
  }
  if (d.warnings) chips.push(chip('QC warning', 'warn'));

  return el('div', { class: 'd-hero', style: { '--hero': color } },
    el('div', { class: 'd-chips' }, ...chips),
    el('div', { class: 'd-date' },
      dateFull(d.dateMeanBP),
      d.dateMeanBP != null && d.dateMeanBP > 70 &&
        el('small', { text: bpLabel(d.dateMeanBP) })),
    el('div', { class: 'd-place', text:
      [d.locality, d.country].filter(Boolean).join(', ') || 'Location not recorded' }));
}

function chip(text, cls = '', color) {
  const node = el('span', { class: `chip ${cls}`.trim(), text });
  if (color) node.style.color = color;
  return node;
}

function section(heading, ...content) {
  return el('div', { class: 'sec' },
    el('div', { class: 'sec-h' }, el('h3', { text: heading })),
    ...content.filter(Boolean));
}

/** Definition list; rows whose value is null are dropped entirely. */
function kv(pairs) {
  const dl = el('dl', { class: 'kv' });
  for (const [k, v, opts = {}] of pairs) {
    if (v == null || v === '' || v === '—') continue;
    dl.append(el('dt', { text: k }));
    const dd = el('dd', opts.mono ? { class: 'mono' } : {});
    if (v instanceof Node) dd.append(v);
    else dd.innerHTML = opts.html ? v : escapeHtml(v);
    if (opts.src) dd.append(el('span', { class: 'src-tag', text: opts.src }));
    dl.append(dd);
  }
  return dl.children.length ? dl : null;
}

function metrics(items) {
  const wrap = el('div', { class: 'metrics' });
  for (const { value, unit, label } of items) {
    if (value == null) continue;
    wrap.append(el('div', { class: 'metric' },
      el('div', { class: 'metric-v' }, String(value),
        unit && el('small', { text: unit })),
      el('div', { class: 'metric-k', text: label })));
  }
  return wrap.children.length ? wrap : null;
}

/* ── sections ────────────────────────────────────────────────────────── */

const SRC_LABEL = {
  label: 'from Group ID', date: 'from date', coord: 'from coordinates',
  none: 'undetermined',
};

function contextSection(d) {
  return section('Context', kv([
    ['Genetic ID', d.id, { mono: true }],
    ['Master ID', d.pid !== d.id ? d.pid : null, { mono: true }],
    ['Individual', d.individual !== d.id ? d.individual : null, { mono: true }],
    ['Skeletal code', d.skeletalCode, { mono: true }],
    ['Element sampled', d.skeletalElement],
    ['Group ID', d.group, { mono: true }],
    ['Site', d.siteName],
    ['Country', d.country],
    ['Region', d.region, { src: SRC_LABEL[d.regionSrc] }],
    ['Coordinates', coordLabel(col('lat')[d.i], col('lon')[d.i])],
    ['Culture', d.culture || null, { src: SRC_LABEL[d.cultureSrc] }],
    ['Subsistence', d.subsistence || null,
      { src: d.subsistenceSrc === 'none' ? null : 'inferred' }],
  ]));
}

function datingSection(d) {
  const rows = kv([
    ['Date', dateFull(d.dateMeanBP)],
    ['Years BP', d.dateMeanBP != null
      ? `${n0(d.dateMeanBP)}${d.dateSdBP ? ` ± ${n0(d.dateSdBP)}` : ''}` : null],
    ['Range', d.dateEarliestBP != null
      ? rangeLabel(d.dateEarliestBP, d.dateLatestBP) : null],
    ['Method', d.dateMethod],
    ['Reported date', d.dateFull, { mono: true }],
    ['Period', d.period, { src: SRC_LABEL[d.periodSrc] }],
  ]);
  const note = !d.directDate && d.dateMeanBP != null
    ? el('div', { class: 'callout', style: { marginTop: '10px' } },
        el('b', { text: 'Contextual date. ' }),
        'This individual was not directly radiocarbon dated; the age comes ' +
        'from the archaeological context, so the uncertainty is wider than ' +
        'the stated interval implies.')
    : null;
  return section('Dating', rows, note);
}

function biologySection(d) {
  const sexLabel = { M: 'Male', F: 'Female', U: 'Undetermined' }[d.sex];
  const parts = [];

  // The XY ratio is only worth showing when it was actually measured.
  const sexText = sexLabel === 'Undetermined' ? 'Undetermined'
    : d.sexRatio != null ? `${sexLabel} (XY ratio ${n2(d.sexRatio)})`
    : sexLabel;

  parts.push(kv([
    ['Genetic sex', sexText],
    ['Morphological sex', d.morphSex
      ? { M: 'Male', F: 'Female', 'M?': 'Probable male', 'F?': 'Probable female' }[d.morphSex] || d.morphSex
      : null],
    ['Age at death', d.ageText],
    ['Family relations', d.family],
  ]));

  // Uniparental haplogroups.
  const haplo = el('div', { style: { marginTop: '12px' } });
  for (const [label, full, root, cov] of [
    ['mtDNA', d.mt, d.mtRoot, d.mtCoverage],
    ['Y chromosome', d.y, d.yRoot, null],
  ]) {
    if (!full) continue;
    haplo.append(el('div', {
      style: { display: 'flex', alignItems: 'center', gap: '9px',
        padding: '8px 10px', marginBottom: '5px', borderRadius: '9px',
        background: 'rgba(255,255,255,.035)',
        border: '1px solid rgba(255,255,255,.05)' },
    },
      el('span', { style: { width: '9px', height: '9px', borderRadius: '50%',
        flex: '0 0 auto', background: cladeColor(root),
        boxShadow: `0 0 9px ${cladeColor(root)}` } }),
      el('div', { style: { flex: '1 1 auto', minWidth: '0' } },
        el('div', { style: { fontFamily: 'var(--mono)', fontSize: '12px' },
          text: full }),
        el('div', { style: { fontSize: '10.5px', color: 'var(--ink-4)' },
          text: `${label} · clade ${root || '?'}${cov ? ` · ${n1(cov)}× mt coverage` : ''}` }))));
  }
  if (haplo.children.length) parts.push(haplo);

  if (d.yISOGG && d.yManual && d.yISOGG !== d.yManual) {
    parts.push(el('div', { class: 'callout info', style: { marginTop: '8px' } },
      el('b', { text: 'Manual Y call. ' }),
      `Automatic call was ${d.yISOGG}; curators revised it to ${d.yManual}.`));
  }

  if (d.rohSumCM != null) {
    parts.push(el('div', { style: { marginTop: '12px' } },
      kv([
        ['ROH > 20 cM', `${n1(d.rohSumCM)} cM across ${d.rohNSegments ?? '—'} segments`],
      ]),
      rohInterpretation(d.rohSumCM)));
  }

  return section('Biological profile', ...parts);
}

/**
 * ROH thresholds follow the interpretation used in Ringbauer et al. 2021,
 * which is the analysis the AADR's ROH columns come from.
 */
function rohInterpretation(sumCM) {
  let text, cls = 'callout';
  if (sumCM >= 200) {
    text = 'Consistent with parents who were first-degree relatives.';
    cls = 'callout warn';
  } else if (sumCM >= 100) {
    text = 'Consistent with parents who were close relatives (roughly first cousins).';
  } else if (sumCM >= 50) {
    text = 'Suggests a small mating pool or more distant parental relatedness.';
  } else if (sumCM > 0) {
    text = 'Background level, typical of a large outbred population.';
  } else {
    return null;
  }
  return el('div', { class: cls, style: { marginTop: '8px' } },
    text, el('span', { class: 'src-tag', text: 'ROH > 20 cM' }));
}

function qualitySection(d) {
  const parts = [metrics([
    { value: d.coverage != null ? n2(d.coverage) : null, unit: '×',
      label: 'Coverage' },
    { value: d.snps1240k ? compact(d.snps1240k) : null, label: 'SNPs (1240k)' },
    { value: d.nLibraries ?? null, label: 'Libraries' },
    { value: d.damage != null ? `${(d.damage * 100).toFixed(1)}` : null,
      unit: '%', label: 'Damage' },
  ])];

  parts.push(kv([
    ['Data type', d.dataType],
    ['Pulldown', d.pulldown],
    ['Library treatment', d.libraryType],
    ['SNPs (HO panel)', d.snpsHO ? n0(d.snpsHO) : null],
    ['SNPs (2M panel)', d.snps2M ? n0(d.snps2M) : null],
    ['Off-target coverage', d.coverageOffTarget != null
      ? `${n2(d.coverageOffTarget)}×` : null],
    ['Endogenous DNA', d.endogenous],
    ['X contamination (ANGSD)', d.contamANGSD
      ? `${n2(d.contamANGSD[0] * 100)}–${n2(d.contamANGSD[1] * 100)}%` : null],
    ['X contamination (hapConX)', d.contamHapConX
      ? `${n2(d.contamHapConX[0] * 100)}–${n2(d.contamHapConX[1] * 100)}%` : null],
    ['mtDNA consensus match', d.mtMatch != null
      ? `${n1(d.mtMatch * 100)}%` : null],
    ['AADR assessment', d.assessment],
  ]));

  if (d.warnings) {
    parts.push(el('div', { class: 'callout warn', style: { marginTop: '10px' } },
      el('b', { text: 'Curator warning. ' }), d.warnings));
  }

  // Recovery of the capture panel is genome-wide in the AADR; per-chromosome
  // breakdown would need the genotype files, so we say so instead of guessing.
  if (d.snps1240k) {
    const frac = Math.min(1, d.snps1240k / 1150000);
    parts.push(el('div', { style: { marginTop: '14px' } },
      el('div', { class: 'chart-sub',
        text: `${(frac * 100).toFixed(1)}% of the 1.15M autosomal capture targets recovered` }),
      el('div', { class: 'bar-outer', style: { height: '8px' } },
        el('div', { class: 'bar-inner', dataset: { w: `${frac * 100}%` },
          style: { background: 'linear-gradient(90deg,#2c7f8f,#5ebf5e,#e8d33a)' } })),
      el('div', { class: 'chart-note', style: { marginTop: '6px' },
        text: 'Genome-wide total. Per-chromosome recovery requires the AADR genotype files and is exposed through the analysis-module API.' })));
  }

  return section('Data quality', ...parts);
}

/**
 * Ancestry components, admixture proportions and archaic fractions are not in
 * the AADR annotation table. Rather than invent them, we state their absence
 * and point at the module that would supply them.
 */
function ancestrySection(d, i) {
  const available = modules.availableFor(d, i);
  if (available.length) return null;
  return section('Ancestry',
    el('div', { class: 'callout info' },
      el('b', { text: 'Not in this dataset. ' }),
      'The AADR annotation file carries no ancestry proportions, PCA ' +
      'coordinates, ADMIXTURE components or archaic-ancestry estimates — ' +
      'those require the genotype release. Connect an analysis module to ' +
      'populate this section.'));
}

function publicationSection(d, pubs) {
  const pub = pubs && d.publication
    ? pubs.find((p) => p.abbrev === d.publication) : null;

  const parts = [];
  if (pub) {
    parts.push(el('div', { class: 'paper' },
      el('div', { class: 'paper-t', text: pub.title || pub.abbrev }),
      el('div', { class: 'paper-m' },
        pub.authors?.length
          ? el('i', { text: pub.authors.slice(0, 3).join(', ') +
              (pub.n_authors > 3 ? ` +${pub.n_authors - 3}` : '') })
          : null,
        pub.journal ? ` · ${pub.journal}` : '',
        pub.year ? ` ${pub.year}` : '',
        pub.citations != null ? ` · ${n0(pub.citations)} citations` : '')));

    const links = el('div', { class: 'link-list', style: { marginTop: '9px' } });
    const order = [['doi', 'DOI'], ['pubmed', 'PubMed'],
      ['europepmc', 'Europe PMC'], ['biorxiv', 'bioRxiv'],
      ['scholar', 'Scholar']];
    for (const [key, label] of order) {
      if (pub.links?.[key]) {
        links.append(el('a', {
          class: 'lnk', href: pub.links[key], target: '_blank',
          rel: 'noopener noreferrer',
        }, label, icon(ICONS.external, 11)));
      }
    }
    if (d.repository) {
      const url = repositoryUrl(d.repository);
      links.append(url
        ? el('a', { class: 'lnk', href: url, target: '_blank',
            rel: 'noopener noreferrer' }, 'Sequence data', icon(ICONS.external, 11))
        : el('span', { class: 'chip', text: d.repository }));
    }
    links.append(el('a', {
      class: 'lnk',
      href: 'https://doi.org/10.7910/DVN/FFIDCW',
      target: '_blank', rel: 'noopener noreferrer',
    }, 'AADR release', icon(ICONS.external, 11)));
    parts.push(links);
  } else if (d.publication) {
    parts.push(kv([['Publication', d.publication, { mono: true }]]));
  }

  if (d.firstPublication && d.firstPublication !== d.publication) {
    parts.push(el('div', { class: 'chart-note', style: { marginTop: '8px' },
      text: `First reported in ${d.firstPublication}.` }));
  }
  return parts.length ? section('Publication', ...parts) : null;
}

/** Turn AADR repository strings such as "ENA:PRJEB22652" into real links. */
function repositoryUrl(raw) {
  const s = String(raw);
  let m = /ENA[:\s]*([A-Z]{3}\d+)/i.exec(s);
  if (m) return `https://www.ebi.ac.uk/ena/browser/view/${m[1]}`;
  m = /(PRJ[EDN][A-Z]\d+)/i.exec(s);
  if (m) return `https://www.ebi.ac.uk/ena/browser/view/${m[1]}`;
  m = /(SRP\d+|SRR\d+|SRS\d+)/i.exec(s);
  if (m) return `https://www.ncbi.nlm.nih.gov/sra/${m[1]}`;
  m = /(https?:\/\/\S+)/.exec(s);
  return m ? m[1] : null;
}

function relatedSection(d, i, sites) {
  if (d.site < 0) return null;
  const siblings = membersOfSite(d.site).filter((r) => r !== i);
  if (!siblings.length) return null;

  const site = sites?.[d.site];
  const head = el('div', { class: 'chart-sub' },
    `${siblings.length} other individual${siblings.length === 1 ? '' : 's'} from `,
    el('a', {
      href: '#', style: { color: 'var(--amber)', textDecoration: 'none' },
      onclick: (e) => { e.preventDefault(); showSite(d.site); },
    }, site?.name || 'this site'));

  const list = el('div');
  for (const r of siblings.slice(0, 40)) {
    list.append(individualRow(r));
  }
  if (siblings.length > 40) {
    list.append(el('div', { class: 'chart-note', style: { padding: '8px' },
      text: `+ ${siblings.length - 40} more — open the site for the full list` }));
  }
  prefetchDetails(siblings.slice(0, 12));
  return section('Same site', head, list);
}

function individualRow(r) {
  const bp = col('dateMean')[r];
  const cov = col('coverage')[r];
  const period = dv('period', r);
  return el('div', {
    class: 'ind-row',
    onclick: () => showIndividual(r),
  },
    el('span', { class: 'ind-dot',
      style: { background: PERIOD_COLORS[period] || '#5a6273' } }),
    el('span', { class: 'ind-id', text: idOf(r) }),
    el('span', { class: 'ind-meta',
      text: Number.isNaN(bp) ? '—' : bpToEra(bp) }),
    el('span', { class: 'ind-meta',
      text: Number.isNaN(cov) ? '' : `${n1(cov)}×` }));
}

/* ══ site ═════════════════════════════════════════════════════════════ */

export async function showSite(siteId) {
  const sites = await loadSites().catch(() => null);
  const site = sites?.[siteId];
  if (!site) { toast('Site record unavailable'); return; }

  currentSite = siteId;
  currentRow = null;
  panel.hidden = false;
  addBtn.hidden = true;
  panel.scrollTop = 0;

  title.textContent = site.name;
  title.style.fontFamily = 'var(--font)';
  sub.textContent = [site.country, site.region].filter(Boolean).join(' · ');

  const members = membersOfSite(siteId);
  handlers.onFocusSite?.(site, members);

  body.replaceChildren(frag(
    siteHero(site),
    section('Overview', metrics([
      { value: n0(site.n), label: 'Individuals' },
      { value: site.n_populations, label: 'Group labels' },
      { value: site.median_bp != null ? bpLabel(site.median_bp) : null,
        label: 'Median date' },
      { value: site.mean_coverage != null ? n2(site.mean_coverage) : null,
        unit: '×', label: 'Mean coverage' },
    ]), kv([
      ['Date span', site.earliest_bp != null
        ? rangeLabel(site.earliest_bp, site.latest_bp) : null],
      ['Directly dated', site.n_direct_dated
        ? `${site.n_direct_dated} of ${site.n}` : null],
      ['Coordinates', coordLabel(site.lat, site.lon)],
      ['Best coverage', site.max_coverage != null
        ? `${n2(site.max_coverage)}×` : null],
      ['Median SNPs', site.median_snps ? n0(site.median_snps) : null],
      ['Cultures', site.cultures?.join(', ') || null],
    ])),
    compositionSection(site, members),
    siteIndividualsSection(members),
    sitePublicationsSection(site),
  ));
  animateBars(body);
}

function siteHero(site) {
  const period = site.periods?.[0];
  const color = PERIOD_COLORS[period] || '#3ec9d6';
  const chips = (site.periods || []).slice(0, 4)
    .map((p) => chip(p, 'dot', PERIOD_COLORS[p]));
  if (site.cultures?.[0]) chips.unshift(chip(site.cultures[0], 'accent'));

  return el('div', { class: 'd-hero', style: { '--hero': color } },
    el('div', { class: 'd-chips' }, ...chips),
    el('div', { class: 'd-date',
      text: site.earliest_bp != null
        ? rangeLabel(site.earliest_bp, site.latest_bp) : 'undated' }),
    el('div', { class: 'd-place',
      text: `${n0(site.n)} individual${site.n === 1 ? '' : 's'} · ${site.country || '—'}` }));
}

function compositionSection(site, members) {
  const bars = (tally, colorFn, total) => {
    const wrap = el('div');
    const rows = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [label, n] of rows) {
      wrap.append(el('div', { class: 'bar-row' },
        el('span', { class: 'bar-label', text: label || '—', title: label }),
        el('span', { class: 'bar-outer' },
          el('span', { class: 'bar-inner',
            dataset: { w: `${(n / total) * 100}%` },
            style: { background: colorFn(label) } })),
        el('span', { class: 'bar-n', text: String(n) })));
    }
    return wrap;
  };

  const periods = new Map(), pops = new Map();
  for (const r of members) {
    const p = dv('period', r);
    periods.set(p, (periods.get(p) || 0) + 1);
    const g = dv('population', r);
    if (g) pops.set(g, (pops.get(g) || 0) + 1);
  }

  const [m, f, u] = site.sexes || [0, 0, 0];
  const sexRow = el('div', { style: { marginTop: '14px' } },
    el('div', { class: 'chart-sub', text: 'Genetic sex' }),
    el('div', { style: { display: 'flex', height: '8px', borderRadius: '4px',
      overflow: 'hidden', gap: '2px' } },
      ...[['M', m], ['F', f], ['U', u]].filter(([, v]) => v > 0).map(([k, v]) =>
        el('span', { title: `${k}: ${v}`,
          style: { flex: `${v} 1 0`, background: SEX_COLORS[k] } }))),
    el('div', { class: 'chart-note', style: { marginTop: '5px' },
      text: `${m} male · ${f} female · ${u} undetermined` }));

  return section('Composition',
    bars(periods, (l) => PERIOD_COLORS[l] || '#5a6273', site.n),
    pops.size > 1 ? el('div', { style: { marginTop: '14px' } },
      el('div', { class: 'chart-sub', text: 'Group labels' }),
      bars(pops, () => 'linear-gradient(90deg,#3ec9d6,#4c8fe0)', site.n)) : null,
    sexRow);
}

function siteIndividualsSection(members) {
  const CAP = 60;
  const sorted = [...members].sort((a, b) => {
    const da = col('dateMean')[a], db = col('dateMean')[b];
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return db - da;
  });

  const list = el('div');
  const render = (upTo) => {
    list.replaceChildren();
    for (const r of sorted.slice(0, upTo)) list.append(individualRow(r));
    if (upTo < sorted.length) {
      list.append(el('button', {
        class: 'btn ghost',
        style: { width: '100%', marginTop: '8px' },
        onclick: () => render(sorted.length),
      }, `Show all ${sorted.length}`));
    }
  };
  render(CAP);
  prefetchDetails(sorted.slice(0, 24));
  return section(`Individuals (${members.length})`, list);
}

function sitePublicationsSection(site) {
  if (!site.publications?.length) return null;
  const list = el('div', { class: 'link-list' });
  for (const abbrev of site.publications) {
    list.append(el('span', { class: 'chip', text: abbrev }));
  }
  const dois = el('div', { class: 'link-list', style: { marginTop: '8px' } });
  for (const doi of (site.dois || []).slice(0, 6)) {
    const clean = String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    dois.append(el('a', {
      class: 'lnk', href: `https://doi.org/${clean}`, target: '_blank',
      rel: 'noopener noreferrer',
    }, clean.length > 28 ? clean.slice(0, 26) + '…' : clean,
      icon(ICONS.external, 11)));
  }
  return section('Publications', list, dois.children.length ? dois : null);
}

/* ── shared ──────────────────────────────────────────────────────────── */

/** Bars render at zero width, then grow, so the panel animates in. */
function animateBars(root) {
  requestAnimationFrame(() => {
    for (const bar of root.querySelectorAll('.bar-inner[data-w]')) {
      bar.style.width = bar.dataset.w;
    }
  });
}
