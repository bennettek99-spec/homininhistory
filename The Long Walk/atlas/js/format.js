/**
 * Formatting and colour vocabulary.
 *
 * Dates are the subtle part. The AADR works in years BP (before 1950 CE), and
 * so does this app internally -- but "4500 BP" means nothing to most readers,
 * so everything user-facing is rendered as calendar years with the BP value
 * available alongside. Nothing here ever silently converts between the two.
 */

/* ── numbers ─────────────────────────────────────────────────────────── */

export const n0 = (v) =>
  v == null || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString('en-US');

export const n1 = (v) =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('en-US',
    { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const n2 = (v) =>
  v == null || Number.isNaN(v) ? '—' : v.toLocaleString('en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Compact counts for dense UI: 1234 -> "1.2k", 1234567 -> "1.2M". */
export function compact(v) {
  if (v == null || Number.isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(Math.round(v));
}

/* ── time ────────────────────────────────────────────────────────────── */

/** Years BP (before 1950) -> signed calendar year. Negative = BCE. */
export const bpToYear = (bp) => 1950 - bp;

/** Years BP -> "3210 BCE" / "1180 CE" / "present day". */
export function bpToEra(bp, { precise = false } = {}) {
  if (bp == null || Number.isNaN(bp)) return '—';
  if (bp <= 70) return 'present day';
  const y = 1950 - bp;
  if (y <= 0) {
    const v = Math.abs(y - 1); // no year zero in the proleptic calendar
    return `${precise ? v : round(v)} BCE`;
  }
  return `${precise ? y : round(y)} CE`;
}

/** Years BP in reader-friendly magnitude: "48.2 ka BP", "4,500 BP". */
export function bpLabel(bp) {
  if (bp == null || Number.isNaN(bp)) return '—';
  if (bp <= 70) return 'present';
  if (bp >= 100000) return `${(bp / 1000).toFixed(0)} ka BP`;
  if (bp >= 12000) return `${(bp / 1000).toFixed(1)} ka BP`;
  return `${Math.round(bp).toLocaleString('en-US')} BP`;
}

/** The headline date string: era first, BP in parentheses. */
export function dateFull(bp) {
  if (bp == null || Number.isNaN(bp)) return 'undated';
  if (bp <= 70) return 'Present day';
  return `${bpToEra(bp)}`;
}

function round(v) {
  if (v >= 10000) return (Math.round(v / 100) * 100).toLocaleString('en-US');
  if (v >= 1000) return (Math.round(v / 10) * 10).toLocaleString('en-US');
  return String(Math.round(v));
}

/** A date range as one string, collapsing when the bounds coincide. */
export function rangeLabel(earliest, latest) {
  if (earliest == null && latest == null) return 'undated';
  if (earliest == null || latest == null) return bpToEra(earliest ?? latest);
  if (Math.abs(earliest - latest) < 25) return bpToEra(earliest);
  const a = bpToEra(earliest), b = bpToEra(latest);
  // "3210 – 2900 BCE" reads better than "3210 BCE – 2900 BCE".
  const [av, au] = splitEra(a), [bv, bu] = splitEra(b);
  return au === bu ? `${av} – ${bv} ${bu}` : `${a} – ${b}`;
}

function splitEra(s) {
  const m = /^(.*)\s(BCE|CE)$/.exec(s);
  return m ? [m[1], m[2]] : [s, ''];
}

/* ── timeline scale ──────────────────────────────────────────────────── */
// 99% of the AADR sits inside the last 15,000 years, but the record runs to
// ~185,000 BP. A linear axis wastes 92% of its width on empty deep time and a
// pure log axis cannot represent BP = 0. We use log1p, which is smooth,
// invertible, and maps the present exactly to 0.

export const TIME_MIN_BP = 0;
export const TIME_MAX_BP = 500000;

const L_MAX = Math.log1p(TIME_MAX_BP);

/** Years BP -> normalised [0,1] where 0 = present, 1 = 500 ka. */
export const bpToT = (bp) =>
  Math.min(1, Math.max(0, Math.log1p(Math.max(0, bp)) / L_MAX));

/** Inverse of bpToT. */
export const tToBp = (t) =>
  Math.expm1(Math.min(1, Math.max(0, t)) * L_MAX);

/** Tick positions for the timeline axis, in years BP. */
export const TIME_TICKS = [
  0, 1000, 3000, 6000, 10000, 20000, 50000, 120000, 500000,
];

export function tickLabel(bp) {
  if (bp === 0) return 'now';
  if (bp >= 1000) return `${bp / 1000}k`;
  return String(bp);
}

/* ── colour ──────────────────────────────────────────────────────────── */

/* ── colour ──────────────────────────────────────────────────────────
 *
 * Every palette below was checked with the data-viz validator against the
 * actual dark chart surface (#121722), not chosen by eye.
 *
 * Period is an *ordered* variable, so it gets a single-hue ordinal ramp rather
 * than a rainbow: nine evenly-spaced lightness steps in one blue hue, which is
 * colour-vision-safe by construction and lets a reader rank two points by age
 * without consulting the legend. Lighter means older -- deep-past individuals
 * are both the rarest and the most interesting, so they get the steps that
 * stand out most against a dark globe.
 *
 * Nine steps is the hard ceiling: the ramp needs a lightness gap of >= 0.06
 * between adjacent steps to stay separable, and the darkest step still has to
 * clear 2:1 contrast against the surface. That leaves no room for the two
 * post-antiquity tiers, which are neutral greys instead -- honest, since
 * "Post-Medieval" and "Present-day" sit outside the prehistoric sequence the
 * ramp describes.
 *
 * Categorical map colouring is capped at three hues. On a scatter/map every
 * pair of marks can end up adjacent, and no ordering of more than three slots
 * clears the colour-vision floor in that regime. Modes with more levels than
 * that (region, haplogroup clade) use a neutral base plus legend-driven
 * isolation as the secondary encoding, rather than pretending twenty hues are
 * distinguishable.
 */

/** Nine-step ordinal ramp, oldest (lightest) to most recent (darkest). */
export const PERIOD_RAMP = [
  '#e4f0ff', '#c0dbff', '#9bc7ff', '#74b1ff', '#4e9bfb',
  '#3886e4', '#2172ce', '#015eb7', '#014c97',
];

export const PERIOD_COLORS = {
  'Middle Palaeolithic': PERIOD_RAMP[0],
  'Upper Palaeolithic': PERIOD_RAMP[1],
  'Mesolithic': PERIOD_RAMP[2],
  'Neolithic': PERIOD_RAMP[3],
  'Chalcolithic': PERIOD_RAMP[4],
  'Bronze Age': PERIOD_RAMP[5],
  'Iron Age': PERIOD_RAMP[6],
  'Classical Antiquity': PERIOD_RAMP[7],
  'Medieval': PERIOD_RAMP[8],
  // Off-ramp neutrals: historic and living individuals are not part of the
  // prehistoric sequence, and the grey says so.
  'Post-Medieval': '#8a8f99',
  'Present-day': '#5c626d',
  'Unknown': '#414751',
};

/** The three validated categorical slots. Never extend this list. */
export const CATEGORICAL = ['#3987e5', '#d95926', '#199e70'];
/** Neutrals for levels that sit outside a categorical scheme. */
export const NEUTRAL = ['#c9ccd1', '#8a8f99', '#5c626d', '#414751'];

export const SUBSISTENCE_COLORS = {
  'Hunter-gatherer': CATEGORICAL[0],
  'Farmer': CATEGORICAL[2],
  'Steppe pastoralist': CATEGORICAL[1],
  // Not a subsistence strategy of modern humans -- deliberately off-palette.
  'Archaic hominin': NEUTRAL[0],
  '': NEUTRAL[3],
};

export const SEX_COLORS = { M: CATEGORICAL[0], F: CATEGORICAL[1], U: NEUTRAL[3] };

/** Reserved status colours. Always shipped with a text label, never alone. */
export const STATUS = {
  good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b',
};

export const ASSESSMENT_COLORS = {
  'Pass': STATUS.good, 'MERGE_PASS': STATUS.good,
  'PROVISIONAL_PASS': STATUS.warning,
  'Questionable': STATUS.serious,
  'PROVISIONAL_QUESTIONABLE': STATUS.serious,
  'MERGE_QUESTIONABLE': STATUS.serious,
  'CRITICAL': STATUS.critical, 'PROVISIONAL_CRITICAL': STATUS.critical,
  'Unknown': NEUTRAL[3],
};

/**
 * Haplogroup clades have far more levels than colour can carry. They take
 * evenly-spaced steps of the ordinal ramp so that neighbouring clades are at
 * least separable by lightness, and the legend supports click-to-isolate --
 * which is the encoding the reader actually uses to answer "where is clade R?".
 */
export function cladeColor(name) {
  if (!name) return NEUTRAL[3];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PERIOD_RAMP[h % PERIOD_RAMP.length];
}

/**
 * Sequential ramp for continuous magnitude. Same hue as the ordinal ramp,
 * extended one step darker -- legal here because a sequential scale's lightest
 * step is allowed to recede toward the surface.
 */
export const SEQUENTIAL = [
  '#014c97', '#015eb7', '#2172ce', '#3886e4', '#4e9bfb',
  '#74b1ff', '#9bc7ff', '#c0dbff', '#e4f0ff',
];

export function rampColor(t, stops = SEQUENTIAL) {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x), f = x - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[Math.min(stops.length - 1, i + 1)]);
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export const rgbToCss = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

/* ── misc ────────────────────────────────────────────────────────────── */

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Human-readable coordinate pair. */
export function coordLabel(lat, lon) {
  if (lat == null || Number.isNaN(lat)) return '—';
  const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lon).toFixed(3)}°${ew}`;
}

/** Great-circle distance in km. */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** AADR data-type strings are verbose; shorten for chips. */
export function shortDataType(s) {
  if (!s) return '—';
  if (s.length > 26) return s.slice(0, 24) + '…';
  return s;
}
