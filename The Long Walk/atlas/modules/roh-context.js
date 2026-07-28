/**
 * ROH & consanguinity context.
 *
 * A worked example of the module API that runs entirely against data the
 * explorer already ships. It answers a question the raw number cannot: is
 * 84 cM of ROH unusual for this individual's time and place?
 *
 * The ROH values themselves are AADR columns, computed by hapROH
 * (Ringbauer et al. 2021, Nature Communications 12:5425). This module does not
 * recompute anything — it contextualises.
 */

const ROH_BANDS = [
  { max: 1, label: 'none detected', tone: '' },
  { max: 50, label: 'background', tone: 'good' },
  { max: 100, label: 'elevated', tone: '' },
  { max: 200, label: 'close-kin parents', tone: 'warn' },
  { max: Infinity, label: 'first-degree parents', tone: 'warn' },
];

let cohorts = null;   // region -> sorted ROH values, for percentile lookup

export default {
  id: 'roh-context',
  name: 'ROH & consanguinity context',
  description:
    'Places an individual\'s runs of homozygosity against contemporaries ' +
    'from the same macro-region. Uses the AADR hapROH columns directly ' +
    '(Ringbauer et al. 2021); nothing is recomputed.',
  scope: 'both',
  source: 'AADR hapROH columns',

  async load() {
    // Nothing to fetch: build the comparison cohorts from the columnar core.
    return true;
  },

  hasData(detail) {
    return detail.rohSumCM != null;
  },

  renderIndividual(detail, rowIndex, h) {
    const value = detail.rohSumCM;
    if (value == null) return null;

    ensureCohorts(h);
    const region = detail.region || 'Unknown';
    const cohort = cohorts.get(region) || cohorts.get('__all__');
    const pct = percentile(cohort, value);
    const band = ROH_BANDS.find((b) => value < b.max);

    const wrap = h.el('div');

    wrap.append(h.el('div', { class: 'metrics' },
      metric(h, h.format.n1(value), 'cM', 'Sum ROH > 20 cM'),
      metric(h, detail.rohNSegments ?? '—', '', 'Segments'),
      metric(h, `${Math.round(pct)}`, 'th', `Percentile in ${region}`)));

    // Percentile strip: where this individual sits in its regional cohort.
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 520 26');
    svg.setAttribute('class', 'chart-svg');
    svg.style.height = '26px';
    svg.setAttribute('preserveAspectRatio', 'none');

    const track = document.createElementNS(NS, 'rect');
    Object.entries({ x: 0, y: 9, width: 520, height: 7, rx: 3.5,
      fill: 'rgba(255,255,255,.07)' })
      .forEach(([k, v]) => track.setAttribute(k, v));
    svg.append(track);

    const fill = document.createElementNS(NS, 'rect');
    Object.entries({ x: 0, y: 9, width: Math.max(3, (pct / 100) * 520),
      height: 7, rx: 3.5, fill: band.tone === 'warn' ? '#d03b3b' : '#3987e5' })
      .forEach(([k, v]) => fill.setAttribute(k, v));
    svg.append(fill);

    const marker = document.createElementNS(NS, 'circle');
    Object.entries({ cx: Math.max(4, (pct / 100) * 520), cy: 12.5, r: 5,
      fill: '#fff', stroke: 'rgba(10,13,20,.9)', 'stroke-width': 2 })
      .forEach(([k, v]) => marker.setAttribute(k, v));
    svg.append(marker);

    wrap.append(svg);

    wrap.append(h.el('div', {
      class: `callout ${band.tone === 'warn' ? 'warn' : ''}`,
      style: { marginTop: '9px' },
    },
      h.el('b', { text: `${band.label[0].toUpperCase()}${band.label.slice(1)}. ` }),
      `Higher than ${Math.round(pct)}% of the ${cohort.length.toLocaleString()} ` +
      `individuals from ${region} with ROH reported. ` +
      (value >= 100
        ? 'Values this high indicate parents who were close relatives.'
        : 'Consistent with a normally outbred population.')));

    return wrap;
  },

  renderGlobal(h) {
    ensureCohorts(h);
    const rows = [...cohorts.entries()]
      .filter(([k]) => k !== '__all__' && cohorts.get(k).length >= 25)
      .map(([region, values]) => ({
        region,
        n: values.length,
        median: values[Math.floor(values.length / 2)],
        highFrac: values.filter((v) => v >= 100).length / values.length,
      }))
      .sort((a, b) => b.highFrac - a.highFrac)
      .slice(0, 10);

    if (!rows.length) return null;

    const wrap = h.el('div');
    wrap.append(h.el('div', { class: 'chart-sub',
      text: 'Share of individuals with more than 100 cM of ROH — the ' +
        'threshold consistent with close-kin parents — by macro-region ' +
        '(regions with at least 25 measurements).' }));

    for (const r of rows) {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 520 7');
      svg.setAttribute('class', 'chart-svg');
      svg.style.height = '7px';
      svg.setAttribute('preserveAspectRatio', 'none');
      const b = document.createElementNS(NS, 'rect');
      Object.entries({ x: 0, y: 0, width: Math.max(2, r.highFrac * 520 * 4),
        height: 7, rx: 3.5, fill: '#d95926' })
        .forEach(([k, v]) => b.setAttribute(k, v));
      svg.append(b);

      wrap.append(h.el('div', { class: 'bar-row' },
        h.el('span', { class: 'bar-label', text: r.region, title: r.region }),
        h.el('span', { style: { flex: '1 1 auto' } }, svg),
        h.el('span', { class: 'bar-n',
          text: `${(r.highFrac * 100).toFixed(1)}%` })));
    }
    wrap.append(h.el('div', { class: 'chart-note', style: { marginTop: '6px' },
      text: 'Bars are scaled ×4 for legibility; labels are the true share.' }));
    return wrap;
  },
};

/* ── helpers ─────────────────────────────────────────────────────────── */

function ensureCohorts(h) {
  if (cohorts) return;
  cohorts = new Map();
  const roh = h.data.column('roh');
  const all = [];

  for (let i = 0; i < h.data.count(); i++) {
    const v = roh[i];
    if (Number.isNaN(v)) continue;
    const region = h.data.decode('region', i) || 'Unknown';
    if (!cohorts.has(region)) cohorts.set(region, []);
    cohorts.get(region).push(v);
    all.push(v);
  }
  for (const values of cohorts.values()) values.sort((a, b) => a - b);
  all.sort((a, b) => a - b);
  cohorts.set('__all__', all);
}

function percentile(sorted, value) {
  if (!sorted.length) return 0;
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1; else hi = mid;
  }
  return (lo / sorted.length) * 100;
}

function metric(h, value, unit, label) {
  return h.el('div', { class: 'metric' },
    h.el('div', { class: 'metric-v' }, String(value),
      unit && h.el('small', { text: unit })),
    h.el('div', { class: 'metric-k', text: label }));
}
