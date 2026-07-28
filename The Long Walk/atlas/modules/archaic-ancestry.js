/**
 * Archaic ancestry — the disconnected reference module.
 *
 * This is deliberately shipped *without* data. It exists to demonstrate the
 * contract for an analysis that the AADR annotation table cannot supply, and
 * to make the absence visible in the interface rather than silent.
 *
 * To connect it, drop a JSON file at `web/data/modules/archaic.json`:
 *
 *   {
 *     "method":   "How the estimates were produced",
 *     "citation": "Author et al. (year)",
 *     "unit":     "fraction",
 *     "estimates": {
 *       "<AADR genetic ID>": {
 *         "neanderthal": 0.021,
 *         "neanderthal_se": 0.004,
 *         "denisovan": 0.001,
 *         "denisovan_se": 0.0009,
 *         "n_informative_sites": 148230
 *       }
 *     }
 *   }
 *
 * The panel renders automatically for every individual present in `estimates`.
 * Nothing is interpolated, defaulted or estimated for individuals that are
 * absent — they simply show no archaic section.
 */

const DATA_URL = 'data/modules/archaic.json';

let payload = null;

export default {
  id: 'archaic-ancestry',
  name: 'Archaic ancestry',
  description:
    'Per-individual Neanderthal and Denisovan ancestry fractions. The AADR ' +
    'annotation table contains none, so this module reads them from an ' +
    'external estimates file produced by a genotype-level pipeline.',
  scope: 'both',
  source: null,

  async load() {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(
        `No estimates file at web/${DATA_URL} (HTTP ${res.status}). ` +
        'This module is a reference implementation and ships disconnected.');
    }
    payload = await res.json();
    if (!payload?.estimates) {
      throw new Error(`${DATA_URL} has no "estimates" object.`);
    }
    this.source = payload.citation || null;
    return true;
  },

  hasData(detail) {
    return Boolean(payload?.estimates?.[detail.id] ||
                   payload?.estimates?.[detail.pid]);
  },

  renderIndividual(detail, rowIndex, h) {
    const est = payload.estimates[detail.id] || payload.estimates[detail.pid];
    if (!est) return null;

    const wrap = h.el('div');
    const rows = [
      ['Neanderthal', est.neanderthal, est.neanderthal_se, '#d95926'],
      ['Denisovan', est.denisovan, est.denisovan_se, '#199e70'],
    ].filter(([, v]) => v != null);

    for (const [label, value, se, color] of rows) {
      // Scale to 5% full width — typical non-African Neanderthal ancestry sits
      // near 2%, so a 0-100% axis would render every bar as a sliver.
      const pct = value * 100;
      const width = Math.min(100, (pct / 5) * 100);

      wrap.append(h.el('div', { style: { marginBottom: '11px' } },
        h.el('div', { style: { display: 'flex', justifyContent: 'space-between',
          fontSize: '11.5px', marginBottom: '5px' } },
          h.el('span', { style: { color: 'var(--ink-3)' }, text: label }),
          h.el('b', { style: { fontVariantNumeric: 'tabular-nums' },
            text: `${pct.toFixed(2)}%${se != null ? ` ± ${(se * 100).toFixed(2)}` : ''}` })),
        h.el('div', { class: 'bar-outer', style: { height: '7px' } },
          h.el('div', { class: 'bar-inner',
            style: { width: `${width}%`, background: color } }))));
    }

    if (est.n_informative_sites) {
      wrap.append(h.el('div', { class: 'chart-note',
        text: `${h.format.compact(est.n_informative_sites)} informative sites.` }));
    }
    if (payload.method) {
      wrap.append(h.el('div', { class: 'callout', style: { marginTop: '9px' } },
        h.el('b', { text: 'Method. ' }), payload.method));
    }
    return wrap;
  },

  renderGlobal(h) {
    const n = Object.keys(payload?.estimates || {}).length;
    return h.el('div', { class: 'chart-note',
      text: `${n.toLocaleString()} individuals carry archaic-ancestry ` +
        `estimates from ${payload.citation || 'the connected source'}.` });
  },
};
