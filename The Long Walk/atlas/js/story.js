/**
 * Guided tours.
 *
 * Each chapter is a camera position plus a filter state plus a paragraph. The
 * paragraphs summarise published findings and name the papers that reported
 * them; the tour never asserts anything the explorer cannot then show you in
 * the data it just filtered to.
 *
 * Filters are expressed as *values*, not dictionary indices, so a tour keeps
 * working across AADR releases even when the dictionaries are renumbered.
 */

import * as filters from './filters.js';
import { dict } from './store.js';
import { $, el, popoverGroup } from './ui.js';

export const TOURS = [
  {
    id: 'out-of-africa',
    icon: '🌍', tint: 'rgba(57,135,229,.16)',
    title: 'Out of Africa',
    blurb: 'The deepest samples in the record, and how thin the evidence gets.',
    chapters: [
      {
        title: 'The edge of the record',
        text: 'Ancient DNA degrades. Beyond roughly 50,000 years the surviving ' +
          'genomes number in the dozens, and nearly all come from cold, stable ' +
          'caves. What you see here is not where people were — it is where DNA ' +
          'survived.',
        view: { lat: 30, lon: 60, zoom: 1.2 },
        time: [30000, 500000],
        filters: {},
      },
      {
        title: 'Upper Palaeolithic Eurasia',
        text: 'From about 45,000 years ago modern-human genomes appear across ' +
          'Eurasia — Ust’-Ishim in Siberia, Bacho Kiro in Bulgaria, Oase in ' +
          'Romania. Several carry recent Neanderthal ancestry, in segments long ' +
          'enough to date the admixture to within a few generations of their lives.',
        view: { lat: 45, lon: 55, zoom: 2.1 },
        time: [11700, 60000],
        filters: { period: ['Upper Palaeolithic'] },
      },
      {
        title: 'After the ice',
        text: 'The Last Glacial Maximum emptied northern Europe. The Mesolithic ' +
          'hunter-gatherers who recolonised it descend from a small number of ' +
          'refugial populations, which is why they look so genetically uniform ' +
          'across thousands of kilometres.',
        view: { lat: 52, lon: 15, zoom: 2.8 },
        time: [7000, 14000],
        filters: { period: ['Mesolithic'] },
      },
    ],
  },
  {
    id: 'first-farmers',
    icon: '🌾', tint: 'rgba(25,158,112,.16)',
    title: 'The first farmers',
    blurb: 'Farming spread into Europe with farmers, not just with ideas.',
    chapters: [
      {
        title: 'Anatolia, 10,000 years ago',
        text: 'The Neolithic package — cereals, sheep, goats, pottery — assembles ' +
          'in southwest Asia. Çatalhöyük and the sites around it give us the ' +
          'ancestral farmer genome that everything downstream is measured against.',
        view: { lat: 37.7, lon: 33.5, zoom: 4.4 },
        time: [7000, 11000],
        filters: { region: ['Near East'], period: ['Neolithic'] },
      },
      {
        title: 'Into Europe',
        text: 'Two routes: along the Mediterranean coast, and up the Danube as the ' +
          'Linearbandkeramik. Early European farmers are genetically Anatolian, ' +
          'with only limited ancestry from the hunter-gatherers they met — the ' +
          'migration was demographic, not purely cultural.',
        view: { lat: 46, lon: 16, zoom: 3.5 },
        time: [5500, 8500],
        filters: { period: ['Neolithic'], region: ['Central Europe', 'Southern Europe'] },
      },
      {
        title: 'Hunter-gatherer resurgence',
        text: 'Across the later Neolithic, hunter-gatherer ancestry rises again in ' +
          'farming populations — the two groups did not simply replace one ' +
          'another, and in several regions the mixing continued for a millennium.',
        view: { lat: 50, lon: 12, zoom: 3.4 },
        time: [4500, 7000],
        filters: { period: ['Neolithic', 'Chalcolithic'] },
      },
    ],
  },
  {
    id: 'steppe',
    icon: '🐎', tint: 'rgba(217,89,38,.16)',
    title: 'The steppe expansion',
    blurb: 'A third ancestry arrives in Europe from the Pontic-Caspian grassland.',
    chapters: [
      {
        title: 'Yamnaya',
        text: 'Around 5,000 years ago, herders on the Pontic-Caspian steppe — the ' +
          'Yamnaya — appear as a genetic population formed from eastern ' +
          'hunter-gatherers and a Caucasus-related source. Wheeled vehicles, ' +
          'kurgan burials, and a mobile pastoral economy.',
        view: { lat: 48, lon: 44, zoom: 3.6 },
        time: [4200, 5600],
        filters: { culture: ['Yamnaya'] },
      },
      {
        title: 'Corded Ware',
        text: 'Within a few centuries, Corded Ware populations across central and ' +
          'northern Europe carry a large fraction of steppe-related ancestry. ' +
          'This is one of the largest and fastest ancestry turnovers visible ' +
          'anywhere in the record.',
        view: { lat: 53, lon: 17, zoom: 3.6 },
        time: [3800, 5000],
        filters: { culture: ['Corded Ware'] },
      },
      {
        title: 'Bell Beaker and Britain',
        text: 'The Beaker complex reaches Britain around 4,400 years ago. Within a ' +
          'few hundred years the island’s gene pool is substantially replaced — ' +
          'the sharpest turnover the British record preserves (Olalde et al. 2018).',
        view: { lat: 53, lon: -2, zoom: 4.6 },
        time: [3600, 4800],
        filters: { culture: ['Bell Beaker'] },
      },
      {
        title: 'East, to the Altai',
        text: 'The same expansion runs east. Afanasievo burials in the Altai are ' +
          'genetically almost indistinguishable from Yamnaya, thousands of ' +
          'kilometres away — evidence of a long-range movement rather than ' +
          'diffusion between neighbours.',
        view: { lat: 50, lon: 87, zoom: 3.4 },
        time: [4000, 5600],
        filters: { culture: ['Afanasievo'] },
      },
    ],
  },
  {
    id: 'archaic',
    icon: '🦴', tint: 'rgba(201,204,209,.14)',
    title: 'Neanderthals and Denisovans',
    blurb: 'The archaic genomes, and what the annotation table can and cannot say.',
    chapters: [
      {
        title: 'The archaic sample',
        text: 'A handful of high-coverage archaic genomes anchor everything we ' +
          'know about introgression: Vindija and Altai Neanderthals, Denisova, ' +
          'Chagyrskaya. On this globe they are a few points in southern Siberia ' +
          'and the Balkans.',
        view: { lat: 50, lon: 78, zoom: 3.0 },
        time: [40000, 500000],
        filters: {},
      },
      {
        title: 'What is not here',
        text: 'The AADR annotation table records dates, coordinates, coverage and ' +
          'haplogroups — it carries no archaic-ancestry fractions. Per-individual ' +
          'Neanderthal and Denisovan percentages require the genotype release, ' +
          'and appear in this explorer only when an analysis module supplies ' +
          'them. Nothing here is estimated for you.',
        view: { lat: 48, lon: 30, zoom: 1.6 },
        time: [0, 500000],
        filters: {},
      },
    ],
  },
  {
    id: 'empires',
    icon: '🏛️', tint: 'rgba(250,178,25,.14)',
    title: 'Rome and after',
    blurb: 'Cosmopolitan cities, and the migrations that followed them.',
    chapters: [
      {
        title: 'Imperial Rome',
        text: 'Individuals buried around Rome in the imperial period are strikingly ' +
          'diverse — many with eastern Mediterranean and Near Eastern ancestry. ' +
          'The city drew people from across the empire (Antonio et al. 2019).',
        view: { lat: 41.9, lon: 12.5, zoom: 6.0 },
        time: [1500, 2600],
        filters: { culture: ['Roman'] },
      },
      {
        title: 'Migration period',
        text: 'After the western empire fragments, the record fills with movement: ' +
          'Langobards into Italy, Anglo-Saxons into Britain, Avars into the ' +
          'Carpathian basin — the last with clear east Asian ancestry, arriving ' +
          'within a generation of the historical accounts.',
        view: { lat: 47, lon: 19, zoom: 4.4 },
        time: [1100, 1700],
        filters: { period: ['Medieval'] },
      },
      {
        title: 'Vikings',
        text: 'Scandinavian populations of the Viking age are far more ' +
          'heterogeneous than the label suggests, with substantial ancestry from ' +
          'outside Scandinavia in many burials (Margaryan et al. 2020).',
        view: { lat: 59, lon: 12, zoom: 4.0 },
        time: [850, 1300],
        filters: { culture: ['Viking'] },
      },
    ],
  },
];

let hud, listEl, chapterEl, titleEl, textEl, dotsEl;
let handlers = {};
let tour = null;
let step = 0;

export function init(callbacks = {}) {
  handlers = callbacks;
  hud = $('#story-hud');
  listEl = $('#story-body');
  chapterEl = $('#hud-chapter');
  titleEl = $('#hud-title');
  textEl = $('#hud-text');
  dotsEl = $('#hud-dots');

  listEl.replaceChildren(...TOURS.map(tourCard));

  $('#btn-story-close').addEventListener('click', () => { $('#story').hidden = true; });
  $('#hud-exit').addEventListener('click', end);
  $('#hud-next').addEventListener('click', () => go(step + 1));
  $('#hud-prev').addEventListener('click', () => go(step - 1));

  document.addEventListener('keydown', (e) => {
    if (!tour) return;
    if (e.key === 'ArrowRight') go(step + 1);
    else if (e.key === 'ArrowLeft') go(step - 1);
    else if (e.key === 'Escape') end();
  });
}

function tourCard(t) {
  return el('div', {
    class: 'story-card',
    onclick: () => start(t.id),
  },
    el('div', { class: 'story-ico', style: { background: t.tint } }, t.icon),
    el('div', { class: 'story-t' },
      el('b', { text: t.title }),
      el('p', { text: t.blurb }),
      el('em', { text: `${t.chapters.length} chapters` })));
}

export function start(id) {
  tour = TOURS.find((t) => t.id === id);
  if (!tour) return;
  $('#story').hidden = true;
  hud.hidden = false;
  step = -1;
  go(0);
}

export function end() {
  tour = null;
  hud.hidden = true;
  filters.reset();
  handlers.onEnd?.();
}

function go(next) {
  if (!tour) return;
  if (next < 0) return;
  if (next >= tour.chapters.length) return end();

  step = next;
  const ch = tour.chapters[step];

  chapterEl.textContent = `${tour.title} · ${step + 1} of ${tour.chapters.length}`;
  titleEl.textContent = ch.title;
  textEl.textContent = ch.text;
  $('#hud-prev').disabled = step === 0;
  $('#hud-next').textContent =
    step === tour.chapters.length - 1 ? 'Finish' : 'Next';

  dotsEl.replaceChildren(...tour.chapters.map((_, k) =>
    el('span', { class: `hud-dot${k === step ? ' on' : ''}` })));

  applyChapter(ch);
}

function applyChapter(ch) {
  // Reset first so chapters do not accumulate each other's filters.
  filters.reset({ keepTime: true });

  for (const [facetKey, labels] of Object.entries(ch.filters || {})) {
    const facet = filters.FACETS.find((f) => f.key === facetKey);
    if (!facet) continue;
    const values = dict(facet.column);
    const indices = labels
      .map((l) => values.indexOf(l))
      .filter((i) => i >= 0);
    // A chapter whose filter matches nothing in this release is skipped rather
    // than applied as an empty selection that would blank the globe.
    if (indices.length) filters.setFacet(facetKey, indices);
  }
  if (ch.time) filters.setTime(ch.time[0], ch.time[1]);

  handlers.onChapter?.(ch);
}

export const isRunning = () => tour != null;
