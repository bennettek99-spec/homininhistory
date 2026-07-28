/**
 * Touch and small-screen behaviour.
 *
 * Kept in one module so the desktop path stays exactly as it was: every
 * function here no-ops unless the device actually reports a coarse pointer or
 * the viewport is phone-sized. Two things drive the design:
 *
 *   1. The top bar cannot hold eight controls at 375 CSS pixels. The previous
 *      breakpoint solved that by hiding Analytics and Story Mode, which made
 *      them unreachable on a phone rather than merely inconvenient. They now
 *      move into an action sheet whose rows forward their click to the real
 *      button, so there is still one implementation of each action.
 *   2. A panel pinned to the bottom edge of a phone screen reads as a sheet,
 *      and a sheet that cannot be swiped away feels broken. Drag-to-dismiss
 *      is wired here rather than in each panel module.
 */

import { $, el, icon, ICONS } from './ui.js';

/** Coarse pointer, i.e. finger or stylus rather than mouse. */
export const isTouch = () =>
  window.matchMedia('(pointer: coarse)').matches;

/** The breakpoint at which panels become bottom sheets. Matches app.css. */
export const isPhone = () =>
  window.matchMedia('(max-width: 900px)').matches;

/* ── action sheet ────────────────────────────────────────────────────── */

const ROWS = [
  { id: 'charts', label: 'Analytics', sub: 'Charts for the current selection',
    path: ['M4 20V10M10 20V4M16 20v-7M22 20H2'], click: '#btn-charts' },
  { id: 'story', label: 'Guided tours', sub: 'Five journeys through the data',
    path: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 0 4 18.5z',
           'M20 3h-8v18h5.5a2.5 2.5 0 0 1 2.5 2.5V3z'], click: '#btn-story' },
  { id: 'layers', label: 'Globe layers', sub: 'Basemap, borders, heatmap',
    path: ['m12 3 9 5-9 5-9-5z', 'm3 13 9 5 9-5'], click: '#btn-layers' },
  { id: 'legend', label: 'Colour & legend', sub: 'What the point colours mean',
    path: ['M12 3a9 9 0 1 0 0 18 2 2 0 0 0 0-4 2 2 0 0 1 0-4h3a5 5 0 0 0 0-10z'],
    toggle: 'legend' },
  { id: 'export', label: 'Export', sub: 'CSV, GeoJSON, JSON, PNG',
    path: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 20h16'], click: '#btn-export' },
  { id: 'about', label: 'About this atlas', sub: 'Sources, methods, limits',
    path: ['M12 16v-5', 'M12 8h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
    click: '#brand' },
];

function buildMoreSheet() {
  const list = $('#more-list');
  const sheet = $('#more');
  if (!list || !sheet) return;

  for (const row of ROWS) {
    const node = el('button', {
      class: 'msheet-row', type: 'button', dataset: { row: row.id },
    },
      icon(row.path, 19),
      el('span', {},
        el('b', { text: row.label }),
        el('span', { class: 'msheet-sub', text: row.sub })));

    node.addEventListener('click', () => {
      closeMore();
      if (row.toggle === 'legend') { toggleLegend(); return; }
      // Forward to the real control. It is display:none at this width, but a
      // programmatic click still runs its handler — the one implementation.
      $(row.click)?.click();
    });
    list.append(node);
  }

  $('#btn-more')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sheet.hidden ? openMore() : closeMore();
  });
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) closeMore();   // tap the scrim
  });
}

function openMore() {
  $('#more').hidden = false;
  $('#btn-more')?.setAttribute('aria-expanded', 'true');
  syncMoreState();
}

function closeMore() {
  $('#more').hidden = true;
  $('#btn-more')?.setAttribute('aria-expanded', 'false');
}

/** Reflect which of the proxied surfaces are currently open. */
function syncMoreState() {
  const on = {
    charts: !$('#charts').hidden,
    layers: !$('#layers').hidden,
    story: !$('#story').hidden,
    legend: $('#hud-legend').classList.contains('show'),
  };
  for (const [id, active] of Object.entries(on)) {
    $(`.msheet-row[data-row="${id}"]`)?.classList.toggle('is-on', active);
  }
}

/* ── legend ──────────────────────────────────────────────────────────── */

/**
 * On desktop the legend is always-on chrome. On a phone it costs too much of
 * the screen to leave up, so it becomes a dismissible bottom sheet — but it
 * still has to be reachable, because without it the colours are unreadable.
 */
function toggleLegend() {
  const lg = $('#hud-legend');
  lg.classList.toggle('show');
}

/* ── drag to dismiss ─────────────────────────────────────────────────── */

/**
 * Vertical drag on a sheet's grab bar or header dismisses it. Committing at
 * either a third of the sheet's height or a fast downward flick matches what
 * a native sheet does, so the gesture does not have to be learned.
 */
function makeDismissable(node, dismiss) {
  if (!node) return;
  let startY = 0, lastY = 0, lastT = 0, dy = 0, active = false;

  const onDown = (e) => {
    if (!isPhone()) return;
    // Only from the grab bar or the header — never from scrollable content,
    // or the sheet would fight the list underneath it.
    const from = e.target.closest('.sheet-grab, .panel-head, .msheet > .sheet-grab');
    if (!from || !node.contains(from)) return;
    active = true; startY = lastY = e.clientY; lastT = e.timeStamp; dy = 0;
    node.classList.add('dragging');
    node.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!active) return;
    dy = Math.max(0, e.clientY - startY);          // downward only
    lastY = e.clientY; lastT = e.timeStamp;
    node.style.transform = `translateY(${dy}px)`;
  };

  const onUp = (e) => {
    if (!active) return;
    active = false;
    node.classList.remove('dragging');
    node.releasePointerCapture?.(e.pointerId);
    const dt = Math.max(1, e.timeStamp - lastT);
    const velocity = (e.clientY - lastY) / dt;      // px per ms
    const far = dy > node.getBoundingClientRect().height / 3;
    node.style.transform = '';
    if (far || velocity > 0.5) dismiss();
  };

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);
}

/* ── setup ───────────────────────────────────────────────────────────── */

export function initMobile({ onCloseDetail, onCloseCharts } = {}) {
  buildMoreSheet();

  makeDismissable($('#rail'), () => { $('#rail').hidden = true; });
  makeDismissable($('#detail'), () => onCloseDetail?.());
  makeDismissable($('#charts'), () => onCloseCharts?.());
  makeDismissable($('#more'), closeMore);
  makeDismissable($('#hud-legend'), () => $('#hud-legend').classList.remove('show'));

  // The legend is desktop chrome that a phone opts into; make sure a device
  // that starts narrow does not show it before it is asked for.
  if (isPhone()) $('#hud-legend').classList.remove('show');

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#more').hidden) closeMore();
  });
}

/**
 * True when a hover tooltip should be suppressed. On a touchscreen the
 * "hover" is the finger itself, so the tip renders underneath it and covers
 * the thing it describes — tapping to open the panel is the real gesture.
 */
export const suppressHoverTip = () => isTouch();
