/**
 * The time scrubber.
 *
 * Two handles over a log1p axis running from the present to 500 ka BP, with a
 * density histogram of the *unfiltered* corpus painted behind them so the user
 * can see where the evidence actually is before choosing a window.
 *
 * Playback sweeps a fixed-width window from deep past to present. The window
 * width is constant in log-space, not in years, so the animation spends a
 * sensible amount of time in both the Palaeolithic and the last millennium.
 */

import { S } from './store.js';
import * as filters from './filters.js';
import {
  bpToT, tToBp, TIME_TICKS, tickLabel, bpToEra, bpLabel, n0,
  PERIOD_COLORS, hexToRgb,
} from './format.js';
import { $, el, raf } from './ui.js';

const PLAY_SECONDS = 26;
const PLAY_WINDOW_T = 0.11;   // window width in normalised log-time

let track, fill, h0, h1, labelEl, countEl, axisEl, canvas, playBtn, playIcon;
let dragging = null;
let playing = false;
let playT = 1;
let playRaf = 0;
let histogram = null;

export function init() {
  track = $('#tl-track');
  fill = $('#tl-fill');
  h0 = $('#tl-h0');
  h1 = $('#tl-h1');
  labelEl = $('#tl-label');
  countEl = $('#tl-count');
  axisEl = $('#tl-axis');
  canvas = $('#tl-density');
  playBtn = $('#tl-play');
  playIcon = $('#tl-play-icon');

  buildAxis();
  buildHistogram();
  bindDrag();

  playBtn.addEventListener('click', togglePlay);
  window.addEventListener('resize', raf(() => { drawHistogram(); syncHandles(); }));

  filters.onChange(onFilterChange);
  onFilterChangeNow(filters.current());
}

/* ── axis + histogram ────────────────────────────────────────────────── */

function buildAxis() {
  axisEl.replaceChildren(...TIME_TICKS.map((bp) =>
    el('span', {
      class: 'tl-tick',
      style: { left: `${bpToT(bp) * 100}%` },
      text: tickLabel(bp),
    })));
}

/**
 * Bin every dated individual into 240 log-time bins, split by period so the
 * histogram doubles as a chronological legend.
 */
function buildHistogram() {
  const BINS = 240;
  const periods = S.dicts.period;
  const bins = Array.from({ length: BINS }, () => new Map());
  let max = 0;

  const dateMean = S.col.dateMean;
  const periodCol = S.col.period;
  for (let i = 0; i < S.n; i++) {
    const bp = dateMean[i];
    if (Number.isNaN(bp)) continue;
    const b = Math.min(BINS - 1, Math.floor(bpToT(bp) * BINS));
    const key = periods[periodCol[i]];
    const m = bins[b];
    const v = (m.get(key) || 0) + 1;
    m.set(key, v);
  }
  for (const m of bins) {
    let total = 0;
    for (const v of m.values()) total += v;
    if (total > max) max = total;
  }
  histogram = { bins, max, BINS };
  drawHistogram();
}

function drawHistogram() {
  if (!histogram || !canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const { bins, max, BINS } = histogram;
  const bw = w / BINS;
  // sqrt keeps the Palaeolithic tail visible next to the Medieval spike
  // without the distortion a log axis would add on top of a log x-axis.
  const scale = (v) => Math.sqrt(v / max) * h;

  const [lo, hi] = filters.state.timeBP;
  const tLo = bpToT(lo), tHi = bpToT(hi);

  for (let b = 0; b < BINS; b++) {
    const m = bins[b];
    if (!m.size) continue;
    const t = (b + 0.5) / BINS;
    const inWindow = t >= tLo && t <= tHi;

    let y = h;
    const entries = [...m.entries()].sort((a, c) => c[1] - a[1]);
    for (const [period, count] of entries) {
      const bh = scale(count);
      const rgb = hexToRgb(PERIOD_COLORS[period] || '#5a6273');
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${inWindow ? 0.85 : 0.2})`;
      ctx.fillRect(b * bw, y - bh, Math.max(1, bw - 0.35), bh);
      y -= bh;
    }
  }
}

/* ── handles ─────────────────────────────────────────────────────────── */

function syncHandles() {
  const [lo, hi] = filters.state.timeBP;
  const a = bpToT(hi) * 100;    // earliest sits at the left of the axis
  const b = bpToT(lo) * 100;
  const left = Math.min(a, b), right = Math.max(a, b);

  // h0 is the older bound (left), h1 the younger (right).
  h0.style.left = `${100 - right}%`;
  h1.style.left = `${100 - left}%`;
  fill.style.left = `${100 - right}%`;
  fill.style.width = `${right - left}%`;

  h0.setAttribute('aria-valuenow', Math.round(hi));
  h1.setAttribute('aria-valuenow', Math.round(lo));

  labelEl.textContent = (lo <= 0 && hi >= 500000)
    ? 'All time — 500 ka BP to present'
    : `${bpLabel(hi)} — ${lo <= 70 ? 'present' : bpLabel(lo)}`;
}

/**
 * The axis is drawn with the deep past on the LEFT, so screen x maps to
 * 1 - t. Every conversion goes through these two functions to keep the
 * inversion in exactly one place.
 */
const xToBP = (frac) => tToBp(1 - Math.min(1, Math.max(0, frac)));

function pointerFrac(clientX) {
  const r = track.getBoundingClientRect();
  return (clientX - r.left) / Math.max(1, r.width);
}

function bindDrag() {
  const start = (which) => (e) => {
    e.preventDefault();
    stopPlay();
    dragging = which;
    document.body.style.cursor = 'grabbing';
    // Keep receiving moves even when the finger leaves the 14px handle,
    // which on a touchscreen it immediately does.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  h0.addEventListener('pointerdown', start('older'));
  h1.addEventListener('pointerdown', start('younger'));

  track.addEventListener('pointerdown', (e) => {
    if (e.target === h0 || e.target === h1) return;
    stopPlay();
    // Grab whichever handle is nearer the click, then drag it.
    const bp = xToBP(pointerFrac(e.clientX));
    const [lo, hi] = filters.state.timeBP;
    dragging = Math.abs(bpToT(bp) - bpToT(hi)) < Math.abs(bpToT(bp) - bpToT(lo))
      ? 'older' : 'younger';
    applyDrag(e.clientX);
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    applyDrag(e.clientX);
  });
  window.addEventListener('pointerup', () => {
    dragging = null;
    document.body.style.cursor = '';
  });

  // Keyboard: arrows nudge in log-space, so a step is always visible.
  for (const [node, which] of [[h0, 'older'], [h1, 'younger']]) {
    node.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      stopPlay();
      const [lo, hi] = filters.state.timeBP;
      const cur = which === 'older' ? hi : lo;
      const stepped = tToBp(bpToT(cur) + dir * (e.shiftKey ? 0.05 : 0.012));
      commit(which, stepped);
    });
  }
}

const applyDrag = raf((clientX) => {
  if (!dragging) return;
  commit(dragging, xToBP(pointerFrac(clientX)));
});

function commit(which, bp) {
  let [lo, hi] = filters.state.timeBP;
  const clamped = Math.min(500000, Math.max(0, bp));
  if (which === 'older') hi = Math.max(clamped, lo + 1);
  else lo = Math.min(clamped, hi - 1);
  filters.setTime(lo, hi);
}

/* ── playback ────────────────────────────────────────────────────────── */

function togglePlay() { playing ? stopPlay() : startPlay(); }

function startPlay() {
  playing = true;
  playT = 1;
  playIcon.innerHTML = '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>';
  playBtn.classList.add('is-on');
  playBtn.setAttribute('aria-label', 'Pause');

  let last = performance.now();
  const step = (now) => {
    if (!playing) return;
    const dt = (now - last) / 1000;
    last = now;
    playT -= dt / PLAY_SECONDS;
    if (playT <= PLAY_WINDOW_T) playT = 1;   // loop back to deep time

    const hi = tToBp(playT);
    const lo = tToBp(Math.max(0, playT - PLAY_WINDOW_T));
    filters.setTime(lo, hi);
    playRaf = requestAnimationFrame(step);
  };
  playRaf = requestAnimationFrame(step);
}

export function stopPlay() {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(playRaf);
  playIcon.innerHTML = '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>';
  playBtn.classList.remove('is-on');
  playBtn.setAttribute('aria-label', 'Play');
}

/* ── react to filter changes ─────────────────────────────────────────── */

function onFilterChangeNow(result) {
  syncHandles();
  drawHistogram();
  countEl.textContent = `${n0(result.n)} in view`;
}

const onFilterChange = raf(onFilterChangeNow);

/** Used by story mode to drive the window programmatically. */
export function setWindow(loBP, hiBP) {
  stopPlay();
  filters.setTime(loBP, hiBP);
}
