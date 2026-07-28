/**
 * The globe.
 *
 * deck.gl's `_GlobeView` renders a true sphere with GPU picking, which is what
 * makes 23,000 individually-pickable points viable at 60 fps. Everything else
 * here is about making that sphere feel like an object rather than a chart:
 * a dark base sphere under the imagery, soft halos under the points, and
 * clustering that expands continuously with zoom instead of popping.
 *
 * Clustering is grid-based in lat/lon with a cell size derived from zoom. It is
 * recomputed only when the quantised zoom level changes, so panning is free and
 * zooming costs one ~3 ms pass over the filtered rows.
 */

import { S, dv, hasFlag } from './store.js';
import {
  PERIOD_COLORS, SUBSISTENCE_COLORS, SEX_COLORS, ASSESSMENT_COLORS,
  cladeColor, hexToRgb, rampColor, bpToEra, n1, compact, NEUTRAL,
} from './format.js';

/**
 * Colour modes with more levels than the three the validator allows on a map.
 * These fall back to lightness steps plus click-to-isolate in the legend; the
 * legend says so, so nobody reads twenty hues as twenty distinguishable ones.
 */
const MANY_LEVEL_MODES = new Set(['region', 'mtRoot', 'yRoot']);
export const isManyLevel = (mode) => MANY_LEVEL_MODES.has(mode);

const D = window.deck;

export const BASEMAPS = {
  satellite: {
    label: 'Satellite',
    note: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 17, brightness: 0.82,
  },
  dark: {
    label: 'Graphite',
    note: 'CARTO dark basemap',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maxZoom: 18, brightness: 1.0,
  },
  terrain: {
    label: 'Topographic',
    note: 'Esri World Shaded Relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 13, brightness: 0.72,
  },
  physical: {
    label: 'Physical',
    note: 'Esri World Physical Map — biome-scale land cover',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 8, brightness: 0.8,
  },
  none: { label: 'None', note: 'Data only, no imagery', url: null },
};

const INITIAL_VIEW = {
  longitude: 22, latitude: 32, zoom: 0.42, pitch: 0, bearing: 0,
};

const OCEAN = [8, 13, 24];
const SPIN_DPS = 2.2;            // idle rotation, degrees/second
const IDLE_BEFORE_SPIN = 4200;   // ms of no interaction before spinning resumes

/**
 * GlobeViewport.resolution is the *cell size in degrees* of the lat/lon grid
 * that flat geometry is cut against before being wrapped onto the sphere
 * (deck.gl's `cutPolygonByGrid`, gridResolution). Smaller means more vertices
 * and a rounder globe — the name reads backwards. deck.gl defaults to 10,
 * which puts only 36 segments around the equator: the base sphere is then a
 * visible polygon whenever imagery has not painted over it. 4 gives 90
 * segments, which reads as round at every zoom. The cost is one-off — the
 * sphere, the borders and each tile quad are tessellated once and cached.
 */
const GLOBE_RESOLUTION = 4;

/**
 * The base sphere, as one lat/lon-rectangle polygon. Hoisted to a constant
 * because `buildLayers` runs on every filter and zoom change: an inline
 * literal is a new array identity each time, so deck.gl would re-cut it
 * against the grid — ~4,000 cells at this resolution — for no reason.
 */
const SPHERE_POLYGON = [
  [[-180, 90], [0, 90], [180, 90], [180, -90], [0, -90], [-180, -90]],
];

const state = {
  deck: null,
  rows: new Int32Array(0),
  colorMode: 'period',
  view: { ...INITIAL_VIEW },
  flat: false,
  options: {
    basemap: 'satellite', borders: false, graticule: false,
    heatmap: false, arcs: false, sites: false, glow: true, spin: true,
  },
  arcs: [],
  borders: null,
  clusters: [],
  clusterZoomKey: null,
  isolate: null,          // legend category singled out; others dim
  highlight: null,        // row index to pulse
  lastInteraction: 0,
  spinning: false,
  raf: 0,
  onPick: () => {},
  onHover: () => {},
  onViewChange: () => {},
};

/**
 * Render resolution. Fragment cost scales with the square of the pixel ratio,
 * and a modern phone reports 3 — nine times the shading work of a 1x display,
 * on a GPU with a fraction of a desktop's budget, for 23,000 points plus a
 * full-screen sphere. Capping at 2 keeps text and point edges crisp while
 * cutting that by more than half. Desktop keeps the browser's own ratio.
 */
function pixelBudget() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (!coarse) return true;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/* ── setup ───────────────────────────────────────────────────────────── */

export function init(canvas, handlers = {}) {
  Object.assign(state, handlers);

  state.deck = new D.Deck({
    canvas,
    views: makeView(),
    initialViewState: state.view,
    controller: {
      dragRotate: false, touchRotate: false, keyboard: true,
      inertia: 420, scrollZoom: { speed: 0.012, smooth: true },
      // Two fingers on a phone should zoom the globe, not the page.
      touchZoom: true,
    },
    useDevicePixels: pixelBudget(),
    parameters: { cullMode: 'back' },
    onViewStateChange: ({ viewState }) => {
      state.view = viewState;
      state.lastInteraction = performance.now();
      state.spinning = false;
      refreshClustersIfNeeded();
      state.deck.setProps({ viewState: state.view, layers: buildLayers() });
      state.onViewChange(viewState);
    },
    onClick: handleClick,
    onHover: handleHover,
    getTooltip: null,
    layers: [],
  });

  loadBorders();
  startLoop();
  return state.deck;
}

function makeView() {
  return state.flat
    ? [new D.MapView({ id: 'main', repeat: true })]
    : [new D._GlobeView({ id: 'main', resolution: GLOBE_RESOLUTION })];
}

/* ── idle rotation ───────────────────────────────────────────────────── */

function startLoop() {
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(64, now - last);
    last = now;

    if (state.options.spin && !state.flat &&
        now - state.lastInteraction > IDLE_BEFORE_SPIN) {
      state.spinning = true;
      state.view = {
        ...state.view,
        longitude: wrapLon(state.view.longitude + SPIN_DPS * dt / 1000),
      };
      state.deck.setProps({ viewState: state.view, layers: buildLayers() });
    }
    state.raf = requestAnimationFrame(tick);
  };
  state.raf = requestAnimationFrame(tick);
}

const wrapLon = (l) => ((l + 180) % 360 + 360) % 360 - 180;

/** Any user gesture defers the idle spin. */
export function nudge() {
  state.lastInteraction = performance.now();
  state.spinning = false;
}

/* ── data ────────────────────────────────────────────────────────────── */

export function setRows(rows) {
  state.rows = rows;
  state.clusterZoomKey = null;   // force a rebuild
  refreshClustersIfNeeded();
  render();
}

export function setColorMode(mode) {
  state.colorMode = mode;
  state.isolate = null;
  state.clusterZoomKey = null;
  refreshClustersIfNeeded();
  render();
}

export function setOption(key, value) {
  state.options[key] = value;
  if (key === 'basemap') state.clusterZoomKey = state.clusterZoomKey; // no-op
  render();
}

export function setArcs(arcs) { state.arcs = arcs || []; render(); }

/** Legend click: single out one category, or clear the isolation. */
export function toggleCategory(label) {
  state.isolate = state.isolate === label ? null : label;
  state.clusterZoomKey = null;
  refreshClustersIfNeeded();
  render();
  return state.isolate;
}

export function setHighlight(rowIndex) {
  state.highlight = rowIndex;
  render();
}

export const getView = () => state.view;
export const isFlat = () => state.flat;
export const options = () => ({ ...state.options });

export function setFlat(flat) {
  state.flat = flat;
  state.view = {
    ...state.view,
    zoom: flat ? Math.max(1.2, state.view.zoom + 1) : Math.max(0.3, state.view.zoom - 1),
  };
  state.deck.setProps({ views: makeView(), viewState: state.view });
  state.clusterZoomKey = null;
  refreshClustersIfNeeded();
  render();
}

/* ── camera ──────────────────────────────────────────────────────────── */

export function flyTo(latitude, longitude, zoom = 5, ms = 1900) {
  nudge();
  state.view = {
    ...state.view,
    latitude, longitude: wrapLon(longitude), zoom,
    transitionDuration: ms,
    transitionInterpolator: new D.FlyToInterpolator({ speed: 1.35, curve: 1.3 }),
    transitionEasing: (t) => (t < 0.5 ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };
  state.deck.setProps({ viewState: state.view });
  // The interpolator mutates viewState internally; clear the transition props
  // afterwards so a later setProps does not replay the flight.
  setTimeout(() => {
    state.view = { ...state.view, transitionDuration: 0,
      transitionInterpolator: undefined };
    refreshClustersIfNeeded();
    render();
  }, ms + 60);
}

export function home() {
  flyTo(INITIAL_VIEW.latitude, INITIAL_VIEW.longitude, INITIAL_VIEW.zoom, 1400);
}

export function zoomBy(delta) {
  nudge();
  const zoom = Math.min(14, Math.max(0.2, state.view.zoom + delta));
  state.view = { ...state.view, zoom, transitionDuration: 320 };
  state.deck.setProps({ viewState: state.view });
  setTimeout(() => {
    state.view = { ...state.view, transitionDuration: 0 };
    refreshClustersIfNeeded(); render();
  }, 360);
}

/** Frame a set of rows: centre on their centroid and pick a fitting zoom. */
export function frameRows(rows, { maxZoom = 7 } = {}) {
  const pts = [];
  for (const i of rows) {
    const lat = S.col.lat[i];
    if (!Number.isNaN(lat)) pts.push([lat, S.col.lon[i]]);
  }
  if (!pts.length) return;
  if (pts.length === 1) return flyTo(pts[0][0], pts[0][1], maxZoom);

  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [la, lo] of pts) {
    minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la);
    minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo);
  }
  const spanLat = maxLat - minLat, spanLon = maxLon - minLon;
  const span = Math.max(spanLat, spanLon * 0.6, 0.5);
  const zoom = Math.min(maxZoom, Math.max(0.4, Math.log2(170 / span) - 0.4));
  flyTo((minLat + maxLat) / 2, (minLon + maxLon) / 2, zoom);
}

/* ── clustering ──────────────────────────────────────────────────────── */

/** Grid cell size in degrees for a given zoom. */
function cellSize(zoom) {
  return Math.max(0.05, 34 / Math.pow(2, Math.max(0, zoom)));
}

function refreshClustersIfNeeded() {
  const key = Math.round(state.view.zoom * 2) / 2;
  if (key === state.clusterZoomKey) return;
  state.clusterZoomKey = key;
  state.clusters = buildClusters(cellSize(key));
}

function buildClusters(cell) {
  const { lat: LAT, lon: LON } = S.col;
  const buckets = new Map();

  for (let k = 0; k < state.rows.length; k++) {
    const i = state.rows[k];
    const la = LAT[i];
    if (Number.isNaN(la)) continue;
    const lo = LON[i];

    // Widen cells toward the poles so clusters stay roughly equal-area.
    const lonCell = cell / Math.max(0.18, Math.cos(la * Math.PI / 180));
    const key = `${Math.floor(la / cell)}:${Math.floor(lo / lonCell)}`;

    let b = buckets.get(key);
    if (!b) { b = { sLat: 0, sLon: 0, n: 0, rows: [] }; buckets.set(key, b); }
    b.sLat += la; b.sLon += lo; b.n++;
    if (b.rows.length < 4000) b.rows.push(i);
  }

  const out = [];
  for (const b of buckets.values()) {
    out.push({
      lat: b.sLat / b.n,
      lon: b.sLon / b.n,
      n: b.n,
      rows: b.rows,
      row: b.n === 1 ? b.rows[0] : -1,
      color: clusterColor(b.rows),
    });
  }
  return out;
}

/**
 * A cluster's colour is the modal category of its members for discrete modes,
 * and the mean for continuous ones. Averaging RGB across categories would
 * produce colours that correspond to nothing.
 */
function clusterColor(rows) {
  if (rows.length === 1) return colorOf(rows[0]);

  if (state.colorMode === 'coverage') {
    let sum = 0, n = 0;
    for (const i of rows) {
      const v = S.col.coverage[i];
      if (!Number.isNaN(v)) { sum += Math.min(v, 20); n++; }
    }
    return n ? rampColor(Math.sqrt(sum / n / 20)) : hexToRgb(NEUTRAL[3]);
  }

  // Under isolation, any cluster containing the isolated category lights up.
  // Using the modal category instead would hide small but real occurrences,
  // which is exactly what someone isolating a clade is looking for.
  if (state.isolate) {
    for (const i of rows) {
      if (categoryOf(i) === state.isolate) {
        return hexToRgb(categoryColor(state.isolate));
      }
    }
    return hexToRgb('#2b313d');
  }

  const tally = new Map();
  for (const i of rows) {
    const c = categoryOf(i);
    tally.set(c, (tally.get(c) || 0) + 1);
  }
  let best = null, bestN = -1;
  for (const [k, v] of tally) if (v > bestN) { best = k; bestN = v; }
  return hexToRgb(categoryColor(best));
}

/* ── colour mapping ──────────────────────────────────────────────────── */

export function categoryOf(i) {
  switch (state.colorMode) {
    case 'period': return dv('period', i);
    case 'region': return dv('region', i);
    case 'subsistence': return dv('subsistence', i) || 'Unclassified';
    case 'sex': return dv('sex', i);
    case 'assessment': return dv('assessment', i);
    case 'mtRoot': return dv('mtRoot', i) || 'Uncalled';
    case 'yRoot': return dv('yRoot', i) || 'Uncalled';
    default: return '';
  }
}

export function categoryColor(label) {
  switch (state.colorMode) {
    case 'period': return PERIOD_COLORS[label] || NEUTRAL[3];
    case 'region': return cladeColor(label);
    case 'subsistence':
      return label === 'Unclassified' ? NEUTRAL[3]
        : (SUBSISTENCE_COLORS[label] || NEUTRAL[3]);
    case 'sex': return SEX_COLORS[label] || NEUTRAL[3];
    case 'assessment': return ASSESSMENT_COLORS[label] || NEUTRAL[3];
    case 'mtRoot': case 'yRoot':
      return label === 'Uncalled' ? NEUTRAL[3] : cladeColor(label);
    default: return '#f0b429';
  }
}

/**
 * When the legend is used to isolate categories, everything else drops to a
 * dim neutral rather than disappearing -- keeping the unselected points on
 * screen preserves the spatial context that makes the isolation readable.
 */
function isolatedColor(label) {
  if (!state.isolate || state.isolate === label) return categoryColor(label);
  return '#2b313d';
}

function colorOf(i) {
  if (state.colorMode === 'coverage') {
    const v = S.col.coverage[i];
    if (Number.isNaN(v)) return hexToRgb(NEUTRAL[3]);
    return rampColor(Math.sqrt(Math.min(v, 20) / 20));
  }
  return hexToRgb(isolatedColor(categoryOf(i)));
}

/** Legend entries for the active colour mode, with live counts. */
export function legend() {
  if (state.colorMode === 'coverage') {
    return { kind: 'ramp', title: 'Mean coverage', min: '0×', max: '20×+' };
  }
  const tally = new Map();
  for (let k = 0; k < state.rows.length; k++) {
    const c = categoryOf(state.rows[k]);
    tally.set(c, (tally.get(c) || 0) + 1);
  }
  const items = [...tally.entries()]
    .map(([label, n]) => ({
      label, n, color: categoryColor(label),
      off: state.isolate != null && state.isolate !== label,
    }))
    .sort((a, b) => b.n - a.n);

  // Period reads as a chronology, so it keeps its time order rather than
  // sorting by frequency -- the ramp is only legible in sequence.
  if (state.colorMode === 'period') {
    const order = S.dicts.periodOrder || [];
    items.sort((a, b) => (order.indexOf(a.label) + 1 || 99) -
                         (order.indexOf(b.label) + 1 || 99));
  }

  return {
    kind: 'categories',
    ordinal: state.colorMode === 'period',
    isolate: state.isolate,
    // Beyond three categories colour alone cannot carry identity on a map;
    // the legend says so and offers isolation as the real read mechanism.
    note: isManyLevel(state.colorMode)
      ? 'Many categories — click one to isolate it'
      : null,
    items: items.slice(0, 18),
  };
}

/* ── layers ──────────────────────────────────────────────────────────── */

function render() {
  if (state.deck) state.deck.setProps({ layers: buildLayers() });
}

function buildLayers() {
  const layers = [];
  const opt = state.options;
  const zoom = state.view.zoom;

  // 1. The sphere itself, so the globe reads as a solid body while tiles
  //    stream in and wherever imagery has no coverage.
  layers.push(new D.SolidPolygonLayer({
    id: 'sphere',
    data: SPHERE_POLYGON,
    getPolygon: (d) => d,
    stroked: false, filled: true,
    getFillColor: OCEAN,
    parameters: { depthTest: false },
  }));

  // 2. Basemap imagery.
  const bm = BASEMAPS[opt.basemap];
  if (bm && bm.url) {
    layers.push(new D.TileLayer({
      id: `tiles-${opt.basemap}`,
      data: bm.url,
      minZoom: 0,
      maxZoom: bm.maxZoom,
      tileSize: 256,
      maxRequests: 12,
      refinementStrategy: 'best-available',
      renderSubLayers: (props) => {
        const { boundingBox } = props.tile;
        return new D.BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [boundingBox[0][0], boundingBox[0][1],
                   boundingBox[1][0], boundingBox[1][1]],
          opacity: bm.brightness,
          // These are Web Mercator tiles: pixel rows are linear in Mercator y,
          // not in latitude. `_imageCoordinateSystem` declares the image's own
          // system, and CARTESIAN is deck.gl's name for Mercator world space —
          // so on a globe (whose native system is LNGLAT) this is the value
          // that asks for a reprojection. Setting LNGLAT here instead says
          // "the image is already lat/lon", and deck.gl skips the conversion:
          // the tile then gets stretched linearly across its latitude span,
          // which drags high-latitude land toward the equator and elongates
          // it, and slides the imagery out from under the vector borders.
          _imageCoordinateSystem: D.COORDINATE_SYSTEM.CARTESIAN,
        });
      },
    }));
  }

  // 3. Country outlines.
  if (opt.borders && state.borders) {
    layers.push(new D.GeoJsonLayer({
      id: 'borders',
      data: state.borders,
      stroked: true, filled: false,
      getLineColor: [255, 255, 255, 46],
      getLineWidth: 1,
      lineWidthUnits: 'pixels',
      pickable: false,
    }));
  }

  // 4. Density heatmap, drawn under the points.
  if (opt.heatmap && state.rows.length > 8) {
    layers.push(new D.HeatmapLayer({
      id: 'heat',
      data: state.clusters,
      getPosition: (d) => [d.lon, d.lat],
      getWeight: (d) => d.n,
      radiusPixels: 46,
      intensity: 1.1,
      threshold: 0.04,
      opacity: 0.5,
      colorRange: [
        [40, 20, 90, 0], [70, 40, 140, 120], [40, 110, 170, 170],
        [40, 170, 150, 200], [180, 200, 60, 220], [250, 220, 70, 240],
      ],
      aggregation: 'SUM',
    }));
  }

  // 5. Migration arcs.
  if (opt.arcs && state.arcs.length) {
    layers.push(new D.ArcLayer({
      id: 'arcs',
      data: state.arcs,
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getSourceColor: [240, 180, 41, 30],
      getTargetColor: [62, 201, 214, 210],
      getWidth: 2.2,
      getHeight: 0.42,
      greatCircle: true,
      widthUnits: 'pixels',
      pickable: true,
    }));
  }

  // 6. Points. Two passes: a wide soft halo that makes dense regions glow,
  //    then a crisp core so individual samples stay legible when zoomed in.
  const data = state.clusters;
  if (opt.glow) {
    layers.push(new D.ScatterplotLayer({
      id: 'halo',
      data,
      getPosition: (d) => [d.lon, d.lat],
      getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 34],
      getRadius: (d) => haloRadius(d, zoom),
      radiusUnits: 'pixels',
      radiusMinPixels: 4,
      radiusMaxPixels: 46,
      pickable: false,
      parameters: { depthTest: false, blend: true },
      updateTriggers: { getFillColor: state.colorMode },
    }));
  }

  layers.push(new D.ScatterplotLayer({
    id: 'points',
    data,
    getPosition: (d) => [d.lon, d.lat],
    getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 232],
    getLineColor: (d) => (d.n > 1 ? [255, 255, 255, 150] : [255, 255, 255, 70]),
    getRadius: (d) => coreRadius(d, zoom),
    radiusUnits: 'pixels',
    radiusMinPixels: 2.2,
    radiusMaxPixels: 30,
    stroked: true,
    lineWidthUnits: 'pixels',
    getLineWidth: (d) => (d.n > 1 ? 1.1 : 0.6),
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 235],
    parameters: { depthTest: false },
    updateTriggers: {
      getFillColor: state.colorMode,
      getRadius: state.clusterZoomKey,
    },
  }));

  // 7. Counts on the larger clusters.
  const labelled = data.filter((d) => d.n >= 12);
  if (labelled.length && labelled.length < 320) {
    layers.push(new D.TextLayer({
      id: 'cluster-labels',
      data: labelled,
      getPosition: (d) => [d.lon, d.lat],
      getText: (d) => compact(d.n),
      getSize: 10.5,
      getColor: [255, 255, 255, 225],
      fontFamily: '-apple-system, Segoe UI, system-ui, sans-serif',
      fontWeight: 600,
      outlineWidth: 2.5,
      outlineColor: [0, 0, 0, 200],
      fontSettings: { sdf: true, buffer: 6 },
      getPixelOffset: [0, 0],
      pickable: false,
      parameters: { depthTest: false },
    }));
  }

  // 8. Selection pulse.
  if (state.highlight != null) {
    const i = state.highlight;
    const la = S.col.lat[i];
    if (!Number.isNaN(la)) {
      const phase = (performance.now() % 1800) / 1800;
      layers.push(new D.ScatterplotLayer({
        id: 'pulse',
        data: [{ lon: S.col.lon[i], lat: la }],
        getPosition: (d) => [d.lon, d.lat],
        getFillColor: [255, 255, 255, 0],
        getLineColor: [240, 180, 41, Math.round(210 * (1 - phase))],
        getRadius: 8 + phase * 26,
        radiusUnits: 'pixels',
        stroked: true, filled: false,
        lineWidthUnits: 'pixels',
        getLineWidth: 2,
        pickable: false,
        parameters: { depthTest: false },
        updateTriggers: { getRadius: phase, getLineColor: phase },
      }));
    }
  }

  return layers;
}

function coreRadius(d, zoom) {
  if (d.n === 1) return zoom > 4 ? 4.4 : 3.1;
  return Math.min(26, 3.4 + Math.sqrt(d.n) * 1.55);
}

function haloRadius(d, zoom) {
  return coreRadius(d, zoom) * (d.n > 1 ? 2.5 : 3.2);
}

/* ── interaction ─────────────────────────────────────────────────────── */

function handleClick(info) {
  nudge();
  if (!info || !info.object || info.layer?.id !== 'points') {
    state.onPick(null);
    return;
  }
  state.onPick(info.object, info);
}

function handleHover(info) {
  if (!info) return;
  if (info.layer?.id === 'arcs' && info.object) {
    state.onHover({ kind: 'arc', arc: info.object, x: info.x, y: info.y });
    return;
  }
  if (!info.object || info.layer?.id !== 'points') {
    state.onHover(null);
    return;
  }
  state.onHover({ kind: 'points', cluster: info.object, x: info.x, y: info.y });
}

/** Tooltip HTML for a hovered cluster or single individual. */
export function describeCluster(d, idOf) {
  if (d.n === 1) {
    const i = d.row;
    const bp = S.col.dateMean[i];
    const cov = S.col.coverage[i];
    const pop = dv('population', i);
    return `<b>${idOf(i)}</b>
      <span>${Number.isNaN(bp) ? 'undated' : bpToEra(bp)} · ${dv('period', i)}</span><br>
      <span>${pop || dv('country', i) || '—'}</span><br>
      <span>${Number.isNaN(cov) ? 'coverage —' : n1(cov) + '× coverage'} ·
        ${dv('sex', i) === 'U' ? 'sex undetermined' : dv('sex', i)}</span>
      <span class="tt-hint">Click for the full record</span>`;
  }

  const tally = new Map();
  for (const i of d.rows) {
    const c = categoryOf(i);
    tally.set(c, (tally.get(c) || 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k || '—'} (${v})`).join(', ');

  let minBP = Infinity, maxBP = -Infinity;
  for (const i of d.rows) {
    const bp = S.col.dateMean[i];
    if (!Number.isNaN(bp)) { minBP = Math.min(minBP, bp); maxBP = Math.max(maxBP, bp); }
  }
  const span = Number.isFinite(minBP)
    ? `${bpToEra(maxBP)} – ${bpToEra(minBP)}` : 'undated';

  return `<b>${d.n.toLocaleString()} individuals</b>
    <span>${span}</span><br>
    <span>${top}</span>
    <span class="tt-hint">Click to zoom in</span>`;
}

/* ── borders ─────────────────────────────────────────────────────────── */

/**
 * Minimal TopoJSON reader.
 *
 * world-atlas ships TopoJSON because it is a quarter the size of the
 * equivalent GeoJSON. Decoding it is about forty lines -- cheaper than adding
 * the topojson-client dependency for one file.
 */
async function loadBorders() {
  try {
    const topo = await fetch('vendor/countries-110m.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    state.borders = topoToGeoJSON(topo, 'countries');
    if (state.options.borders) render();
  } catch {
    state.borders = null;   // borders are optional chrome; failure is silent
  }
}

function topoToGeoJSON(topo, objectName) {
  const obj = topo.objects[objectName];
  if (!obj) return null;
  const { scale, translate } = topo.transform || {};

  const decodeArc = (arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return scale
        ? [x * scale[0] + translate[0], y * scale[1] + translate[1]]
        : [x, y];
    });
  };
  const arcs = topo.arcs.map(decodeArc);

  const ring = (indices) => {
    const out = [];
    for (const idx of indices) {
      const reversed = idx < 0;
      const line = arcs[reversed ? ~idx : idx];
      const pts = reversed ? line.slice().reverse() : line;
      // Consecutive arcs share an endpoint; drop the duplicate.
      out.push(...(out.length ? pts.slice(1) : pts));
    }
    return out;
  };

  const features = obj.geometries.map((g) => {
    let coordinates = null, type = g.type;
    if (g.type === 'Polygon') coordinates = g.arcs.map(ring);
    else if (g.type === 'MultiPolygon') {
      coordinates = g.arcs.map((poly) => poly.map(ring));
    } else return null;
    return {
      type: 'Feature',
      properties: g.properties || {},
      geometry: { type, coordinates },
    };
  }).filter(Boolean);

  return { type: 'FeatureCollection', features };
}
