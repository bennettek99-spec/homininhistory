/**
 * Recorded kinship.
 *
 * The AADR "Family relations" column is free text entered by curators, e.g.
 * "brother of I1234", "2nd degree rel. to I5678". This module parses the
 * sample IDs out of it and turns them into links, without inferring anything:
 * if the field is empty, there is nothing to show. Genetic relatedness that
 * was *not* written into that column requires genotypes and is out of scope.
 */

// Sample IDs in the AADR look like I1234, VLASA7, RISE98, sometimes suffixed.
const ID_PATTERN = /\b([A-Z]{1,4}\d{2,6}[A-Za-z0-9_.]{0,8})\b/g;

const DEGREE_HINTS = [
  [/\bmother\b/i, 'mother'], [/\bfather\b/i, 'father'],
  [/\bdaughter\b/i, 'daughter'], [/\bson\b/i, 'son'],
  [/\bsister\b/i, 'sister'], [/\bbrother\b/i, 'brother'],
  [/\bsibling/i, 'sibling'], [/\btwin/i, 'twin'],
  [/\b1st[- ]degree|\bfirst[- ]degree/i, 'first-degree relative'],
  [/\b2nd[- ]degree|\bsecond[- ]degree/i, 'second-degree relative'],
  [/\b3rd[- ]degree|\bthird[- ]degree/i, 'third-degree relative'],
  [/\bgrand/i, 'grandparent/grandchild'],
  [/\bcousin/i, 'cousin'],
  [/\bavuncular/i, 'avuncular'],
];

let idIndex = null;   // genetic id -> row index

export default {
  id: 'kinship',
  name: 'Recorded kinship',
  description:
    'Parses the AADR curator-entered "Family relations" field into links to ' +
    'the named relatives. Reports only what the curators wrote; no ' +
    'relatedness is inferred.',
  scope: 'individual',
  source: 'AADR Family relations column',

  async load() {
    // ids.txt is fetched here rather than at first render so that a network
    // failure marks the module unavailable instead of breaking a panel.
    const res = await fetch('data/ids.txt', { cache: 'force-cache' });
    if (!res.ok) throw new Error(`ids.txt: HTTP ${res.status}`);
    const ids = (await res.text()).split('\n');
    idIndex = new Map();
    ids.forEach((id, i) => { if (id) idIndex.set(id, i); });
    return true;
  },

  hasData(detail) {
    return Boolean(detail.family);
  },

  renderIndividual(detail, rowIndex, h) {
    const raw = detail.family;
    if (!raw) return null;

    const wrap = h.el('div');
    wrap.append(h.el('div', {
      style: { fontSize: '12.3px', color: 'var(--ink-2)', marginBottom: '10px',
        lineHeight: '1.55' },
      text: raw,
    }));

    const hint = DEGREE_HINTS.find(([re]) => re.test(raw));

    // Resolve any sample IDs mentioned, excluding self-references.
    const mentioned = new Set();
    for (const match of raw.matchAll(ID_PATTERN)) {
      const id = match[1];
      if (id === detail.id || id === detail.pid) continue;
      if (idIndex.has(id)) mentioned.add(id);
    }

    if (mentioned.size) {
      const list = h.el('div');
      for (const id of mentioned) {
        const row = idIndex.get(id);
        const bp = h.data.column('dateMean')[row];
        const period = h.data.decode('period', row);
        list.append(h.el('div', {
          class: 'ind-row',
          onclick: () => window.dispatchEvent(
            new CustomEvent('aadr:show-individual', { detail: { row } })),
        },
          h.el('span', { class: 'ind-dot',
            style: { background: h.colors.period[period] || '#414751' } }),
          h.el('span', { class: 'ind-id', text: id }),
          h.el('span', { class: 'ind-meta',
            text: Number.isNaN(bp) ? '—' : h.format.bpToEra(bp) })));
      }
      wrap.append(h.el('div', { class: 'chart-sub',
        text: `${mentioned.size} named relative${mentioned.size === 1 ? '' : 's'} in this release` }));
      wrap.append(list);
    } else {
      wrap.append(h.el('div', { class: 'chart-note',
        text: 'No sample IDs in this note resolve to individuals in the ' +
          'current release.' }));
    }

    if (hint) {
      wrap.append(h.el('div', { class: 'callout', style: { marginTop: '9px' } },
        h.el('b', { text: 'Relationship: ' }), hint[1], '.'));
    }
    return wrap;
  },
};
