/** Small DOM helpers shared across the UI modules. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element from a tag, props and children. */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const frag = (...children) => {
  const f = document.createDocumentFragment();
  for (const c of children.flat()) {
    if (c != null && c !== false) {
      f.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }
  return f;
};

/** Inline SVG icon from a path spec. */
export function icon(paths, size = 14) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.style.width = svg.style.height = `${size}px`;
  for (const d of [].concat(paths)) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

export const ICONS = {
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 5 5 9-10',
  external: ['M14 4h6v6', 'M20 4 11 13', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  info: ['M12 16v-5', 'M12 8h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
};

/* ── toasts ──────────────────────────────────────────────────────────── */

let toastHost = null;

export function toast(message, { ms = 2600 } = {}) {
  toastHost ||= $('#toasts');
  if (!toastHost) return;
  const node = el('div', { class: 'toast', text: message });
  toastHost.append(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 320);
  }, ms);
}

/* ── tooltip ─────────────────────────────────────────────────────────── */

let tipEl = null;

export function showTip(html, x, y) {
  tipEl ||= $('#tooltip');
  if (!tipEl) return;
  tipEl.innerHTML = html;
  tipEl.hidden = false;
  // Flip toward the cursor when close to a viewport edge so the tip never
  // hangs off screen.
  const r = tipEl.getBoundingClientRect();
  const dx = x + r.width + 26 > window.innerWidth ? -r.width - 14 : 12;
  const dy = y + r.height + 26 > window.innerHeight ? -r.height - 14 : 12;
  tipEl.style.transform = `translate(${dx}px, ${dy}px)`;
  tipEl.style.left = `${x}px`;
  tipEl.style.top = `${y}px`;
}

export function hideTip() {
  tipEl ||= $('#tooltip');
  if (tipEl) tipEl.hidden = true;
}

/* ── timing ──────────────────────────────────────────────────────────── */

export function debounce(fn, ms = 150) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Coalesce calls into one per animation frame. */
export function raf(fn) {
  let queued = false, lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
  };
}

/* ── misc ────────────────────────────────────────────────────────────── */

/** Skeleton placeholder block, sized in lines. */
export function skeleton(lines = 4) {
  return el('div', { class: 'skel-wrap' },
    ...Array.from({ length: lines }, (_, i) =>
      el('div', {
        class: 'skel skel-line',
        style: { width: `${100 - (i % 3) * 16}%` },
      })));
}

export function emptyState(message, sub) {
  return el('div', { class: 'empty' },
    icon(ICONS.info, 34),
    el('div', { text: message }),
    sub && el('div', { style: { marginTop: '6px', fontSize: '11px' }, text: sub }));
}

/** Download a Blob under a filename. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Manage a group of mutually-exclusive popovers. */
export function popoverGroup(entries) {
  const closeAll = (except) => {
    for (const [node] of entries) if (node !== except) node.hidden = true;
  };
  for (const [node, button] of entries) {
    button?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = node.hidden;
      closeAll(willOpen ? node : null);
      node.hidden = !willOpen;
      button.classList.toggle('is-on', willOpen);
      for (const [n, b] of entries) {
        if (n !== node) b?.classList.remove('is-on');
      }
    });
    node.addEventListener('click', (e) => e.stopPropagation());
  }
  document.addEventListener('click', () => {
    closeAll(null);
    for (const [, b] of entries) b?.classList.remove('is-on');
  });
  return closeAll;
}
