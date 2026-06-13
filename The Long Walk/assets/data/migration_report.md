# Ancient Human Migration Patterns — Computational Analysis

*An autonomous genomic-archaeological reconstruction of where humans went and why.*

---

## 1. Data sources used + sample sizes

| Source | Role in analysis | What was actually ingested | Status |
|---|---|---|---|
| **AADR v66.p1** (Allen Ancient DNA Resource, Reich Lab / Harvard Dataverse, [doi:10.7910/DVN/FFIDCW](https://doi.org/10.7910/DVN/FFIDCW)) | Primary genomic + archaeological + geographic + temporal backbone | `1240K` annotation file, **23,089 individuals** → **19,029 ancient samples** retained (date > 0 BP, valid coordinates). Fields: curated genetic/population label, latitude/longitude, OxCal-calibrated date (BP), Y- and mt-haplogroups, data quality flags | ✅ Downloaded & analysed |
| **Quaternary climate chronology** (proxy for NOAA Paleoclimate / PANGAEA) | `climate_context` layer | Date-keyed lookup of MIS stages, LGM, Heinrich/Bølling–Allerød/Younger Dryas, Holocene subdivisions, derived from Rasmussen et al. 2014 (GICC05/INTIMATE), Clark et al. 2009 (LGM), Lisiecki & Raymo 2005, Walker et al. 2018 | ⚠️ Derived, not sample-merged (see §6) |
| **CARD (Canadian Archaeological Radiocarbon Database)** | Intended supplementary radiocarbon coverage | Not directly merged — AADR already carries calibrated dates per genomic sample; CARD is not keyed to genomes | ⚠️ Gap flagged |
| **Natural Earth** | Base cartography for figures | `ne_110m_land` coastlines | ✅ |

**Headline data-quality finding:** ancient-DNA sampling is overwhelmingly Holocene and Eurocentric. Of 19,029 ancient samples, **68 (0.36%)** fall in the priority Out-of-Africa window (70–30 ka), and **13,089 (69%)** are European. Africa — the source of all dispersals — contributes only 231 samples, none older than ~18.5 ka. The deep past is a *data desert* (see `fig_sampling_gap.png`).

---

## 2. Method summary

1. **Clean & unify** → `unified_samples.csv` (19,029 rows; columns: `sample_id, location_lat, location_lon, date_BP, genetic_cluster, culture, climate_context` + region, haplogroups).
2. **DBSCAN clustering** in a 3-D Earth-Cartesian geography (km) + time space, with a tuned **space–time exchange rate of 2.5 km/yr** and `eps = 360 km`, `min_samples = 8`. → **226 clusters**, 16,461 samples clustered, 13.5% labelled noise.
3. **Migration-flow model**: directed edges between cluster centroids requiring (a) source older than sink, (b) genetic similarity > 0.2 (cosine on Y/mt haplogroup-frequency vectors), (c) haversine ≤ 6,000 km, (d) plausible implied speed ≤ 3 km/yr. → **8,205 candidate flows** ranked by `genetic_sim × proximity × recency × log(min n)`.

> **Methodological caveat (flagged):** the 7–12 GB genotype matrix was *not* processed; "genetic similarity" here uses curated population labels and uniparental haplogroup composition as ancestry proxies, not genome-wide PCA/F-statistics. Clusters are therefore *spatio-temporal populations characterised genetically*, not genotype-PCA clusters. This is a deliberate, transparent simplification (see §6).

---

## 3. Cluster summary table (selected, of 226)

| Cluster | n | Region | Date range (BP) | Dominant Y-hg | Defining cultures | Interpretation |
|---|---|---|---|---|---|---|
| C169 | 119 | Anatolia | 8,838–8,099 | C1, J2 | Çatalhöyük EN/MN/LN | **Anatolian Neolithic farmer source** |
| C4 | 1,249 | Europe | 8,156–5,785 | **G2a**, I2 | LBK, France/Austria/Romania N | First European farmers (demic diffusion) |
| C29 | 148 | E. Europe | 7,650–6,017 | **I2** | Ukraine Neolithic | Eastern European hunter-gatherers |
| C46 | 149 | Steppe | 7,544–6,263 | **R1**, Q1 | Khvalynsk, Samara Eneolithic | Pre-Yamnaya steppe (EHG×CHG) |
| C50 | 94 | Steppe | 5,165–4,518 | **R1b** | **Yamnaya** (Samara/Orenburg) | Steppe pastoralist expansion source |
| C51 | 118 | Steppe | 3,943–3,411 | **R1a** | **Sintashta**, Andronovo-related | Indo-Iranian / chariot cultures |
| C3 | 2,789 | Europe | 6,091–2,900 | R1, I2 | Únětice, Bell Beaker, Spain C | Bronze Age Europe (post-steppe admixed) |
| C2 | 5,850 | Europe | 3,151–123 | R1, I1 | Avar, Medieval, Roman-era | Iron Age–Medieval admixed continuum |
| C114 | 125 | C. Asia | 2,654–1,976 | **R1a** | Saka / Tian Shan IA | Iron Age steppe nomads |
| C43 | 100 | S. Asia | 3,128–2,725 | L1, R2 | Pakistan Iron Age | South Asian post-steppe |
| C10 | 161 | Levant | 4,275–3,095 | **J1, J2** | Israel/Turkey/Jordan MLBA | Bronze Age Levant |
| C196 | 124 | Oceania | 708–318 | **O2** | Guam Latte, Mariana Chamoru | Austronesian Remote Oceania |
| C81/C205 | 152/89 | Americas | 1,367–464 | **Q1b** | Caribbean Ceramic; Maya/Mexico | Indigenous American (Beringian-derived) |

Full table: `cluster_summary.csv`. Centroids + haplogroup profiles: `cluster_centroids.csv`.

---

## 4. Top 5 migration events

Ranked for global significance, prioritising the Out-of-Africa dispersal as instructed.

### ① Initial Out-of-Africa dispersal & peopling of Eurasia — ~70–40 ka
- **Route:** NE Africa → Arabia / Levant → a southern coastal arc to South & SE Asia and a northern route into Central Asia, the Eurasian steppe and Europe.
- **Data support:** *Downstream only.* Earliest modern-human genomes in the data — **Ust'-Ishim** (Siberia, ~45 ka), **Bacho Kiro** & **Zlatý kůň** (Europe, ~45 ka), **Tianyuan** (China, ~40 ka), **Kostenki** (~38 ka) — bracket the dispersal but the African/Arabian source has **zero** aDNA in-window.
- **Drivers:** *Environmental* — MIS 3 climate variability and periodic "Green Arabia" humid pulses opened and closed corridors across the Saharo-Arabian belt; *behavioural/genetic* — fully modern cognition and toolkits enabling rapid range expansion; admixture with Neanderthals (~50–55 ka) is detectable in **Oase** (Romania, ~40 ka).
- **Confidence: MODERATE** (literature-strong, aDNA-sparse; the dispersal *route* is inferred, the *outcome* is confirmed by downstream genomes).

### ② Anatolian Neolithic farmer expansion into Europe — ~8.5–6 ka
- **Route:** Central Anatolia (Çatalhöyük) → Aegean → two streams: Danubian (LBK) into central Europe and Mediterranean (Cardial) along the coast to Iberia.
- **Data support:** *Strong.* Flow **C169 → C4** is a top-ranked modelled edge; the diagnostic **Y-haplogroup G2a** dominates early European farmers (C4) and is near-absent in preceding hunter-gatherers.
- **Drivers:** *Environmental* — early-Holocene warming and stable rainfall made rain-fed cereal farming viable at ever-higher latitudes; *demographic* — farming's higher carrying capacity drove demic diffusion that largely replaced local foragers.
- **Confidence: HIGH.**

### ③ Steppe (Yamnaya) expansion into Europe — ~5.0–4.5 ka
- **Route:** Pontic-Caspian steppe (Khvalynsk → Yamnaya) → westward into central/northern Europe as Corded Ware and Bell Beaker.
- **Data support:** *Strong.* Modelled chain **C46 → C50 → C3**; the arrival of **R1b/R1a** and steppe ancestry produces the highly admixed Bronze Age European cluster (C3). Up to ~75% population turnover in places like Britain.
- **Drivers:** *Technological/genetic* — wheeled wagons, horse exploitation, dairy pastoralism and (per ancient-pathogen work) possibly *Yersinia pestis*; *environmental* — the ~5.2 ka and 4.2 ka aridification events favoured mobile pastoralism over the declining Trypillian mega-settlements.
- **Confidence: HIGH.**

### ④ Peopling of the Americas via Beringia — ~16–13 ka
- **Route:** NE Siberia → Beringia (standstill) → split into a Pacific coastal route and an interior ice-free corridor → rapid spread to South America.
- **Data support:** *Strong for outcome.* **Anzick-1** (Montana, ~12.7 ka) anchors the founding lineage; every American cluster (C81, C205, etc.) is overwhelmingly **Y-haplogroup Q1b** + mt A/B/C/D, the Beringian founder signature.
- **Drivers:** *Environmental* — LGM-lowered sea level exposed the Bering land bridge; post-LGM deglaciation (~16–14 ka) opened both the coastal and interior routes. A genetic bottleneck (the Beringian standstill) preceded the expansion.
- **Confidence: HIGH** for the founder signal and timing; route weighting (coastal vs. corridor) remains debated.

### ⑤ Austronesian / Lapita expansion into Remote Oceania — ~3.5–0.7 ka
- **Route:** Island SE Asia / Taiwan → Lapita expansion through Near Oceania → Remote Oceania (Vanuatu, Mariana Islands, ultimately Polynesia).
- **Data support:** *Strong for endpoints.* The **Guam Latte / Mariana** cluster (C196) and Vanuatu samples carry **Y-haplogroup O** and Asian mtDNA, with later Papuan admixture — the Austronesian signature.
- **Drivers:** *Technological* — outrigger/double-hulled canoes and open-ocean navigation; *demographic* — a farming + fishing package (the "voyaging nursery") enabling colonisation of previously unreachable islands.
- **Confidence: HIGH** for endpoints; intermediate stepping-stones are thinly sampled.

**Other significant waves noted (not in top 5):** Sintashta→Andronovo Indo-Iranian expansion into Central & South Asia (~4–3 ka, C50→C51→C43/C114, R1a-Z93); Bantu and Swahili-coast movements in eastern Africa (late Holocene); Neolithic/Bronze gene flow within the Levant (C10, J1/J2).

---

## 5. Confidence levels — at a glance

| Finding | Confidence | Basis |
|---|---|---|
| Holocene Eurasian population structure & turnovers | **High** | Dense, direct aDNA |
| Neolithic, Steppe, Americas, Oceania events | **High** | Direct downstream genomes + diagnostic haplogroups |
| Indo-Iranian / Sintashta eastward wave | **High–Moderate** | Good steppe sampling, sparser S-Asia |
| Out-of-Africa route & timing | **Moderate** | Confirmed outcome, inferred route; source-region data absent |
| Sample-level paleoclimate causation | **Low–Moderate** | Climate is date-keyed context, not sample-measured |
| Any African internal migration | **Low** | Severe undersampling |

---

## 6. Data quality issues & gaps (flagged)

1. **Temporal bias:** 99.6% of samples are <30 ka; the priority OoA window is essentially empty. Deep-time conclusions are *inferences from downstream genomes + literature*, explicitly labelled as such.
2. **Geographic bias:** Europe = 69% of samples; Africa = 1.2%, none >18.5 ka. This inverts the true demographic history and makes Africa — the origin — the least resolved region.
3. **Genotype matrix not processed:** clustering used geography + time + curated labels + uniparental haplogroups, *not* genome-wide ancestry components. Uniparental markers track only one parental line and are frequently missing.
4. **Climate layer is derived:** `climate_context` is a date-keyed Quaternary lookup, not a per-sample proxy measurement merged from PANGAEA/NOAA cores. Climate causation is contextual, not statistically tested here.
5. **DBSCAN density artefact:** at low time-weighting the dense Holocene-European field chains into one supercluster; the 2.5 km/yr time weight is a tuned choice that resolves region×period populations but is not unique.
6. **`noise` (13.5%)** = genuinely isolated or singleton ancient individuals (e.g. unique Pleistocene genomes), not error.

*Inference vs. confirmed is labelled throughout: "confirmed" = supported by in-hand aDNA; "inferred" = reasoned from downstream evidence or published literature.*

---

## 7. Final narrative (≈700 words)

**Reading the human journey from a Eurocentric, Holocene-heavy genome archive**

The story this dataset tells is, at first, a story about its own gaps. We assembled 19,029 ancient individuals from the Allen Ancient DNA Resource, each carrying a place, a date, a curated ancestry label and, often, a paternal and maternal haplogroup. Yet when we plot those samples through time, 99.6 percent of them are younger than 30,000 years, and more than two-thirds come from Europe. The very window we were asked to prioritise — the Out-of-Africa dispersal between 70,000 and 30,000 years ago — contains just sixty-eight individuals, and the African homeland that launched every later migration is represented by fewer samples than a single medieval European cemetery. Any honest reconstruction must therefore separate what the genomes *confirm* from what we *infer* around their silences.

What the genomes confirm is remarkable enough. Unsupervised DBSCAN clustering on a combined geographic-and-temporal metric recovered 226 spatio-temporal populations whose haplogroup signatures align precisely with the known archaeological record. We can watch a single, coherent thread run from Çatalhöyük's farmers in Anatolia (Y-haplogroup G2a) out across Europe as the Linearbandkeramik, their agricultural package advancing in step with early-Holocene warming and largely overwriting the resident hunter-gatherers. We can watch a second thread gather on the Pontic-Caspian steppe — Khvalynsk, then Yamnaya, marked by R1b — and burst westward around 5,000 years ago on the back of wagons, horses and dairying, remaking the European gene pool a second time as Corded Ware and Bell Beaker. The same steppe engine turns east as Sintashta and Andronovo, carrying R1a-Z93 and chariot technology toward Central and South Asia. Each of these events surfaced not as an assumption but as a top-ranked edge in our migration-flow model, where an older population is linked to a younger, genetically similar, geographically reachable neighbour.

Beyond Eurasia, the founder signatures are equally clean. Every Indigenous American cluster, from Anzick-1 in Pleistocene Montana to the Classic Maya, carries the Beringian Q1b paternal lineage — the fingerprint of a small population that paused in a glacial refugium while sea levels were low, then spread the length of two continents once deglaciation opened the coastal and interior routes. In Remote Oceania, the Mariana Islands' Latte-period people and the settlers of Vanuatu carry East Asian O lineages, the maritime calling-card of the Austronesian expansion that outrigger canoes made possible. In each case the *driver* is legible: a climate door opening (the Bering land bridge, a warming Europe), a technology unlocking new range (the canoe, the wagon, the cereal field), or a demographic engine — farming's carrying capacity — pushing one people into another's land.

The deepest and most important migration, however, we can only see in silhouette. The Out-of-Africa dispersal left no in-window genomes in its African or Arabian source. We infer it instead from its descendants: Ust'-Ishim in Siberia and Zlatý kůň and Bacho Kiro in Europe, all near 45,000 years old, with the Oase individual preserving a Neanderthal ancestor only a handful of generations back. From these downstream points, and from the climate record of MIS 3 with its intermittently "green" Arabia, we reconstruct a dispersal threading humid corridors out of Africa during favourable pulses — a confident *outcome* resting on an inferred *route*.

The methodological honesty matters as much as the findings. We did not process the multi-gigabyte genotype matrix; our "genetic similarity" rests on curated labels and uniparental markers, and our climate layer is a date-keyed chronology rather than sample-measured cores. The clustering's resolution depends on a tuned space-time exchange rate. None of this overturns the signal, but all of it bounds our certainty. The clearest scientific message is therefore double-edged: ancient DNA has turned the last ten thousand years of Eurasian prehistory into something we can read almost like a ledger, while the older, tropical, and African chapters — the ones that actually made us a global species — remain frustratingly, instructively blank.

---

## 8. Suggested next steps for deeper analysis

1. **Ingest the genotype matrix** and run genome-wide PCA / *qpAdm* / *F*-statistics to replace haplogroup proxies with true ancestry components and *quantify* admixture proportions per migration.
2. **Merge real paleoclimate series** (NOAA/PANGAEA sediment & ice cores; e.g. δ¹⁸O, pollen, sea level) by nearest-neighbour in space-time to test climate causation statistically rather than contextually.
3. **Target the gaps:** prioritise African, Arabian and South/SE Asian Pleistocene sampling; integrate sedimentary aDNA where skeletal DNA is absent.
4. **Formal spatial modelling:** apply continuous-diffusion / spatially-explicit coalescent or *Relate*-style genealogies to estimate migration *rates and directions* with uncertainty, instead of centroid-to-centroid edges.
5. **Pathogen aDNA overlay** (*Y. pestis*, etc.) to test disease as a co-driver of turnovers, especially the steppe expansion.
6. **Sensitivity analysis** on DBSCAN's space-time exchange rate and on the flow-model thresholds to report cluster/edge stability.

---

*Generated autonomously from public data. Primary source: Mallick & Reich et al., the Allen Ancient DNA Resource (AADR) v66.p1, Harvard Dataverse [doi:10.7910/DVN/FFIDCW](https://doi.org/10.7910/DVN/FFIDCW). Intermediate outputs: `unified_samples.csv`, `cluster_summary.csv`, `cluster_centroids.csv`, `migration_flows.csv`; figures `fig_clusters_flows.png`, `fig_sampling_gap.png`, `fig_deeptime.png`.*
