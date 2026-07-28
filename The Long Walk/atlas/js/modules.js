/**
 * Analysis-module registry.
 *
 * The explorer ships the AADR annotation table and nothing else. Any analysis
 * that needs genotypes -- PCA, ADMIXTURE, chromosome painting, IBD, qpAdm,
 * D-statistics, archaic-ancestry estimates -- lives outside this codebase and
 * plugs in here.
 *
 * A module is a plain ES module exporting a default object:
 *
 *   export default {
 *     id:          'archaic-ancestry',        // unique, stable
 *     name:        'Archaic ancestry',
 *     description: 'Neanderthal and Denisovan fractions per individual',
 *     scope:       'individual' | 'global' | 'both',
 *     source:      'Citation or provenance for whatever it computes',
 *
 *     // Resolve any data the module needs. Rejecting marks it unavailable;
 *     // the UI shows why rather than failing.
 *     async load() { ... },
 *
 *     // Is there anything to show for this individual?
 *     hasData(detail, rowIndex) { return true; },
 *
 *     // Return a DOM node, or null. Runs only when hasData() passed.
 *     renderIndividual(detail, rowIndex, helpers) { ... },
 *
 *     // Return a DOM node for the Analytics > Modules tab.
 *     renderGlobal(helpers) { ... },
 *   };
 *
 * Modules listed in `web/modules/registry.json` are discovered and imported at
 * boot. A module that throws, 404s or rejects in load() is reported as
 * unavailable and never breaks the rest of the interface.
 */

import { S, col, dv, membersOfSite, idOf, getDetail } from './store.js';
import {
  n0, n1, n2, compact, bpToEra, bpLabel, PERIOD_COLORS, cladeColor,
} from './format.js';
import { el, icon, ICONS, emptyState } from './ui.js';

const registry = new Map();
const status = new Map();   // id -> 'ready' | 'unavailable' | 'error'
const reasons = new Map();

/** Helpers handed to every module so it never reaches into internals. */
export const helpers = {
  el, icon, ICONS,
  format: { n0, n1, n2, compact, bpToEra, bpLabel },
  colors: { period: PERIOD_COLORS, clade: cladeColor },
  data: {
    column: (name) => col(name),
    decode: (name, i) => dv(name, i),
    siteMembers: membersOfSite,
    idOf,
    detail: getDetail,
    count: () => S.n,
  },
  /** Standard "this module has no data" block, so all modules look alike. */
  unavailable(message, detail) {
    return el('div', { class: 'callout info' },
      el('b', { text: 'Not connected. ' }), message,
      detail && el('div', { style: { marginTop: '6px', fontSize: '10.5px',
        color: 'var(--ink-4)' }, text: detail }));
  },
};

export function register(mod) {
  if (!mod?.id) throw new Error('A module needs an id');
  registry.set(mod.id, mod);
  status.set(mod.id, 'pending');
}

/** Discover and load everything in modules/registry.json. */
export async function discover() {
  let list = [];
  try {
    const res = await fetch('modules/registry.json', { cache: 'no-cache' });
    if (res.ok) list = await res.json();
  } catch {
    list = [];   // no registry is a normal state, not an error
  }

  await Promise.all(list.map(async (entry) => {
    const path = typeof entry === 'string' ? entry : entry.path;
    if (!path) return;
    try {
      const mod = (await import(`../${path}`)).default;
      if (!mod?.id) throw new Error('module has no default export with an id');
      register(mod);
      await mod.load?.();
      status.set(mod.id, 'ready');
    } catch (err) {
      const id = (typeof entry === 'object' && entry.id) || path;
      status.set(id, 'unavailable');
      reasons.set(id, String(err?.message || err));
      if (!registry.has(id) && typeof entry === 'object') {
        // Keep a placeholder so the Modules tab can explain the gap.
        registry.set(id, {
          id, name: entry.name || id,
          description: entry.description || '',
          scope: entry.scope || 'global', placeholder: true,
        });
      }
    }
  }));
  return [...registry.keys()];
}

export const isReady = (id) => status.get(id) === 'ready';
export const list = () => [...registry.values()];

/** Modules that have something to say about this individual. */
export function availableFor(detail, rowIndex) {
  const out = [];
  for (const mod of registry.values()) {
    if (!isReady(mod.id)) continue;
    if (mod.scope === 'global') continue;
    try {
      if (mod.hasData ? mod.hasData(detail, rowIndex) : true) out.push(mod);
    } catch { /* a broken predicate must not hide the rest of the panel */ }
  }
  return out;
}

/** Render every individual-scoped module into one section. */
export function renderFor(detail, rowIndex) {
  const mods = availableFor(detail, rowIndex);
  if (!mods.length) return null;

  const wrap = el('div', { class: 'sec' },
    el('div', { class: 'sec-h' }, el('h3', { text: 'Analysis modules' })));

  for (const mod of mods) {
    let node = null;
    try {
      node = mod.renderIndividual?.(detail, rowIndex, helpers);
    } catch (err) {
      node = el('div', { class: 'callout warn' },
        el('b', { text: `${mod.name} failed. ` }), String(err.message || err));
    }
    if (!node) continue;
    wrap.append(el('div', { style: { marginBottom: '14px' } },
      el('div', { class: 'chart-head' },
        el('span', { class: 'chart-title', text: mod.name }),
        mod.source && el('span', { class: 'chart-note', text: mod.source })),
      node));
  }
  return wrap.children.length > 1 ? wrap : null;
}

/** The Analytics → Modules tab. */
export function renderCatalogue() {
  const wrap = el('div');

  wrap.append(el('div', { class: 'chart-sub', style: { marginBottom: '14px' } },
    'The explorer reads the AADR annotation table, which contains no genotypes. ' +
    'Analyses that need genotype data plug in here through a stable module API ' +
    'and appear automatically in the interface — no UI changes required.'));

  if (!registry.size) {
    wrap.append(emptyState('No modules registered',
      'Add an entry to web/modules/registry.json to attach one.'));
    return wrap;
  }

  for (const mod of registry.values()) {
    const st = status.get(mod.id) || 'unavailable';
    const ok = st === 'ready';

    const card = el('div', {
      style: { padding: '13px', borderRadius: '11px', marginBottom: '9px',
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.05)' },
    },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '9px',
        marginBottom: '5px' } },
        el('span', { style: { width: '7px', height: '7px', borderRadius: '50%',
          background: ok ? 'var(--green)' : 'var(--ink-4)',
          boxShadow: ok ? '0 0 8px var(--green)' : 'none' } }),
        el('b', { style: { fontSize: '12.8px', fontWeight: '560' },
          text: mod.name }),
        el('span', { class: 'chip', text: mod.scope || 'global' }),
        el('span', { class: `chip ${ok ? 'good' : ''}`,
          text: ok ? 'connected' : 'not connected' })),
      mod.description && el('div', { class: 'chart-note',
        style: { lineHeight: '1.55' }, text: mod.description }),
      !ok && reasons.get(mod.id) && el('div', {
        class: 'chart-note',
        style: { marginTop: '6px', color: 'var(--ink-4)',
          fontFamily: 'var(--mono)', fontSize: '10px' },
        text: reasons.get(mod.id),
      }));

    if (ok && (mod.scope === 'global' || mod.scope === 'both')) {
      try {
        const node = mod.renderGlobal?.(helpers);
        if (node) card.append(el('div', { style: { marginTop: '11px' } }, node));
      } catch (err) {
        card.append(el('div', { class: 'callout warn', style: { marginTop: '9px' } },
          String(err.message || err)));
      }
    }
    wrap.append(card);
  }

  wrap.append(el('div', { class: 'callout', style: { marginTop: '14px' } },
    el('b', { text: 'Writing a module. ' }),
    'See ', el('code', { text: 'web/modules/README.md' }),
    ' for the full contract, and ',
    el('code', { text: 'web/modules/roh-context.js' }),
    ' for a worked example that runs against the shipped data.'));

  return wrap;
}
