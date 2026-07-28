/**
 * Instant search across every named entity in the corpus.
 *
 * The index is built once, lazily, on first focus -- about 32,000 entries
 * spanning individuals, sites, populations, cultures, countries, publications
 * and haplogroups. Matching runs in two passes: a cheap `indexOf` sweep that
 * handles the overwhelming majority of queries, then a subsequence fuzzy pass
 * only when the substring pass came back thin. That keeps a keystroke under a
 * couple of milliseconds without giving up on typo tolerance.
 */

import {
  S, dict, loadIdsText, loadSites, loadPublications, idOf,
} from './store.js';
import { escapeHtml, bpToEra, compact, PERIOD_COLORS, cladeColor } from './format.js';
import { $, el, debounce } from './ui.js';

const KIND_ORDER = ['individual', 'site', 'population', 'culture', 'publication',
  'country', 'region', 'period', 'haplogroup'];

const KIND_LABEL = {
  individual: 'Individuals', site: 'Sites', population: 'Populations',
  culture: 'Cultures', publication: 'Publications', country: 'Countries',
  region: 'Regions', period: 'Periods', haplogroup: 'Haplogroups',
};

let index = null;
let building = null;
let input, results, handlers = {};
let activeIdx = -1;
let currentHits = [];

export function init(callbacks = {}) {
  handlers = callbacks;
  input = $('#search');
  results = $('#search-results');

  input.addEventListener('focus', () => { ensureIndex(); });
  input.addEventListener('input', debounce(onInput, 90));
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', () => setTimeout(close, 160));

  // "/" focuses search from anywhere that is not already a text field.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isTyping(e.target)) {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      close();
      input.blur();
    }
  });
}

const isTyping = (t) =>
  t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

/* ── index construction ──────────────────────────────────────────────── */

function ensureIndex() {
  if (index || building) return building;
  building = build().then((idx) => { index = idx; building = null; return idx; });
  return building;
}

async function build() {
  const entries = [];
  const push = (kind, label, sub, ref, weight = 1) => {
    if (!label) return;
    entries.push({ kind, label, lower: label.toLowerCase(), sub, ref, weight });
  };

  // Dictionary-backed entities are free -- already in memory.
  const periodOrder = dict('periodOrder');
  for (const p of dict('period')) {
    if (p && p !== 'Unknown') push('period', p, 'Archaeological period', p, 1.4);
  }
  for (const r of dict('region')) {
    if (r && r !== 'Unknown') push('region', r, 'Macro-region', r, 1.4);
  }
  for (const c of dict('country')) if (c) push('country', c, 'Country', c, 1.3);
  for (const c of dict('culture')) if (c) push('culture', c, 'Culture', c, 1.5);
  for (const p of dict('population')) {
    if (p) push('population', p, 'AADR Group ID', p, 1.2);
  }
  for (const h of dict('mtRoot')) {
    if (h) push('haplogroup', h, 'mtDNA clade', { type: 'mt', value: h }, 0.9);
  }
  for (const h of dict('yRoot')) {
    if (h) push('haplogroup', h, 'Y clade', { type: 'y', value: h }, 0.9);
  }

  // These three require network payloads; fetch them together.
  const [ids, sites, pubs] = await Promise.all([
    loadIdsText().catch(() => null),
    loadSites().catch(() => null),
    loadPublications().catch(() => null),
  ]);

  if (sites) {
    for (const s of sites) {
      push('site', s.name, `${s.country || '—'} · ${s.n} individual${s.n === 1 ? '' : 's'}`,
        s.id, 1.6);
    }
  }
  if (pubs) {
    for (const p of pubs) {
      push('publication', p.abbrev,
        p.title ? `${p.title.slice(0, 84)}${p.title.length > 84 ? '…' : ''}` :
          `${p.journal || ''} ${p.year || ''}`.trim(),
        p.id, 1.1);
      if (p.title) {
        // Index the title separately so a search for real words finds the paper.
        entries.push({
          kind: 'publication', label: p.title, lower: p.title.toLowerCase(),
          sub: `${p.abbrev} · ${p.journal || ''} ${p.year || ''}`.trim(),
          ref: p.id, weight: 1.0, alias: p.abbrev,
        });
      }
    }
  }
  if (ids) {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id) {
        entries.push({
          kind: 'individual', label: id, lower: id.toLowerCase(),
          sub: null, ref: i, weight: 1.0,
        });
      }
    }
  }

  return entries;
}

/* ── matching ────────────────────────────────────────────────────────── */

const WORD_SPLIT = /[\s_\-.,;:()/[\]]+/;

/**
 * Score one query token against one entry.
 *
 * A prefix match beats a word-boundary match beats a mid-token match, and
 * shorter labels win ties -- "Roman" should outrank "Romania_IronAge_Roman"
 * for the query "roman".
 */
function scoreToken(entry, token) {
  const pos = entry.lower.indexOf(token);
  if (pos === 0) return 1000 - Math.min(300, entry.label.length * 1.2);
  if (pos > 0) {
    const boundary = WORD_SPLIT.test(entry.lower[pos - 1]);
    return (boundary ? 640 : 400) - Math.min(200, pos * 0.8)
      - Math.min(150, entry.label.length * 0.5);
  }
  return -1;
}

/**
 * Approximate match, used only when the substring pass comes back thin.
 *
 * Bounded Levenshtein against the entry's *words*, not against the whole
 * string. An ordered-subsequence match over the full label looks tolerant but
 * is actually useless here: "neolthic" subsequence-matches
 * "Khanevo (Moscow Oblast, Mozhaysky Municipality)" because a long enough
 * string contains almost any short letter sequence in order.
 */
function fuzzyToken(entry, token) {
  if (token.length < 4) return -1;
  const budget = token.length <= 6 ? 1 : 2;
  let best = -1;
  for (const word of entry.lower.split(WORD_SPLIT)) {
    if (!word || Math.abs(word.length - token.length) > budget) continue;
    const d = editDistance(word, token, budget);
    if (d >= 0) best = Math.max(best, 300 - d * 90 - entry.label.length * 0.4);
  }
  return best;
}

/** Levenshtein, abandoned as soon as it exceeds `budget`. Returns -1 then. */
function editDistance(a, b, budget) {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) > budget) return -1;
  let prev = new Array(m + 1);
  let cur = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;

  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > budget) return -1;
    const t = prev; prev = cur; cur = t;
  }
  return prev[m] <= budget ? prev[m] : -1;
}

function query(raw) {
  const q = raw.trim().toLowerCase();
  if (!index || q.length < 1) return [];

  // Multi-word queries are ANDed across tokens, so "bell beaker britain" finds
  // the paper whose title contains all three in any order.
  const tokens = q.split(WORD_SPLIT).filter(Boolean);
  if (!tokens.length) return [];

  const hits = [];
  for (const e of index) {
    let total = 0, ok = true;
    for (const t of tokens) {
      const s = scoreToken(e, t);
      if (s <= 0) { ok = false; break; }
      total += s;
    }
    if (ok) hits.push({ e, s: (total / tokens.length) * e.weight });
  }

  if (hits.length < 8) {
    const seen = new Set(hits.map((h) => h.e));
    for (const e of index) {
      if (seen.has(e)) continue;
      let total = 0, ok = true;
      for (const t of tokens) {
        // Each token may match exactly or approximately; all must match.
        const s = Math.max(scoreToken(e, t), fuzzyToken(e, t));
        if (s <= 0) { ok = false; break; }
        total += s;
      }
      if (ok) hits.push({ e, s: (total / tokens.length) * e.weight * 0.6 });
      if (hits.length > 500) break;
    }
  }

  // A multi-word query that matches nothing gets narrowed to its single
  // most productive token, and the UI says so. An OR fallback was tried and
  // rejected: for "bell beaker britain" it confidently returned
  // "New Britain, Papua New Guinea", which is worse than an honest miss.
  if (!hits.length && tokens.length > 1) {
    // Pick the token with the strongest single match, not the one with the
    // most matches -- "bell" matches more strings than "beaker" only because
    // it is a substring of unrelated words like "Campbell".
    let bestToken = null, bestHits = [], bestScore = 0;
    for (const t of tokens) {
      const partial = [];
      let top = 0;
      for (const e of index) {
        const s = scoreToken(e, t);
        if (s > 0) {
          const weighted = s * e.weight;
          partial.push({ e, s: weighted });
          if (weighted > top) top = weighted;
        }
      }
      if (top > bestScore) { bestScore = top; bestHits = partial; bestToken = t; }
    }
    if (bestToken) {
      bestHits.sort((a, b) => b.s - a.s);
      const grouped = groupByKind(bestHits);
      grouped.narrowedTo = bestToken;
      return grouped;
    }
  }

  hits.sort((a, b) => b.s - a.s);
  return groupByKind(hits);
}

/**
 * Group by kind so one prolific category cannot crowd out the rest, but order
 * the *groups* by their best hit rather than by a fixed category order. With a
 * fixed order, searching "bell" put three tenuous site matches above the
 * "Bell Beaker" culture simply because sites are listed before cultures.
 */
function groupByKind(hits) {
  const byKind = new Map();
  for (const h of hits) {
    const arr = byKind.get(h.e.kind) || [];
    if (arr.length < 8) { arr.push(h); byKind.set(h.e.kind, arr); }
  }

  const kinds = [...byKind.keys()].sort((a, b) => {
    const best = (k) => byKind.get(k)[0].s;
    return (best(b) - best(a)) ||
      (KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  });

  const out = [];
  for (const kind of kinds) out.push(...byKind.get(kind));
  return out.slice(0, 40);
}

/* ── rendering ───────────────────────────────────────────────────────── */

async function onInput() {
  const raw = input.value;
  if (!raw.trim()) return close();

  await ensureIndex();
  currentHits = query(raw);
  activeIdx = currentHits.length ? 0 : -1;
  // Highlighting marks the first token; marking every token in a multi-word
  // query turns the result list into a wall of highlight.
  const first = raw.trim().toLowerCase().split(WORD_SPLIT).filter(Boolean)[0];
  renderResults(first || '');
}

function renderResults(queryToken) {
  const q = currentHits.narrowedTo || queryToken;
  results.replaceChildren();
  if (!currentHits.length) {
    results.append(el('div', { class: 'sr-empty' },
      `No match for “${input.value.trim()}”`));
    open();
    return;
  }

  if (currentHits.narrowedTo) {
    results.append(el('div', {
      class: 'sr-group',
      style: { color: 'var(--amber)', textTransform: 'none',
        letterSpacing: '0', fontSize: '11.5px', fontWeight: '450' },
      text: `No result matches every word — showing matches for “${currentHits.narrowedTo}”`,
    }));
  }

  let lastKind = null;
  currentHits.forEach((hit, i) => {
    const { e } = hit;
    if (e.kind !== lastKind) {
      results.append(el('div', { class: 'sr-group', text: KIND_LABEL[e.kind] }));
      lastKind = e.kind;
    }
    const row = el('div', {
      class: `sr-item${i === activeIdx ? ' is-on' : ''}`,
      role: 'option',
      onmousedown: (ev) => { ev.preventDefault(); choose(hit); },
      onmouseenter: () => { activeIdx = i; paintActive(); },
    },
      el('span', { class: 'sr-dot', style: { background: dotColor(e), color: dotColor(e) } }),
      el('span', { class: 'sr-main' },
        el('span', { class: 'sr-name', html: highlight(e.label, q) }),
        e.sub && el('span', { class: 'sr-meta', text: e.sub })),
      e.kind === 'individual' && el('span', { class: 'sr-tag', text: 'sample' }));
    row.dataset.idx = i;
    results.append(row);
  });
  open();
}

function dotColor(e) {
  if (e.kind === 'period') return PERIOD_COLORS[e.label] || '#8792a3';
  if (e.kind === 'haplogroup') return cladeColor(e.ref?.value || e.label);
  return { individual: '#f0b429', site: '#3ec9d6', population: '#4ec9a0',
    culture: '#c44079', publication: '#8792a3', country: '#4c8fe0',
    region: '#9d6be0' }[e.kind] || '#8792a3';
}

function highlight(label, q) {
  const safe = escapeHtml(label);
  const pos = label.toLowerCase().indexOf(q);
  if (pos < 0) return safe;
  const a = escapeHtml(label.slice(0, pos));
  const b = escapeHtml(label.slice(pos, pos + q.length));
  const c = escapeHtml(label.slice(pos + q.length));
  return `${a}<mark>${b}</mark>${c}`;
}

function paintActive() {
  for (const node of results.querySelectorAll('.sr-item')) {
    node.classList.toggle('is-on', Number(node.dataset.idx) === activeIdx);
  }
}

function onKeyDown(e) {
  if (results.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    activeIdx = (activeIdx + dir + currentHits.length) % currentHits.length;
    paintActive();
    results.querySelector('.sr-item.is-on')
      ?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && activeIdx >= 0) {
    e.preventDefault();
    choose(currentHits[activeIdx]);
  }
}

function choose(hit) {
  close();
  input.blur();
  handlers.onSelect?.(hit.e);
}

function open() {
  results.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function close() {
  results.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  activeIdx = -1;
}

export function setQuery(text) {
  input.value = text;
  onInput();
}
