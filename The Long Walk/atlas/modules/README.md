# Analysis modules

The explorer ships the AADR **annotation table** and nothing else. That table
has dates, coordinates, coverage, SNP counts, uniparental haplogroups, ROH,
contamination estimates and QC verdicts — and no genotypes.

So it cannot, on its own, produce:

- genome-wide PCA or UMAP
- ADMIXTURE / qpAdm / f-statistics / D-statistics
- Neanderthal or Denisovan ancestry fractions
- chromosome painting, local ancestry, IBD segments
- genetic relatedness between two individuals
- selection scans

All of those need the `.geno` release (7–12 GB per SNP set, same Dataverse
record). Rather than fake them, the interface states plainly that they are
absent and loads them from **modules** when a module is connected.

A module is a plain ES module. No build step, no bundler, no framework.

---

## The contract

```js
export default {
  // Required. Unique and stable across releases.
  id: 'archaic-ancestry',
  name: 'Archaic ancestry',
  description: 'Neanderthal and Denisovan fractions per individual.',

  // 'individual' -> renders inside a sample panel
  // 'global'     -> renders in Analytics → Modules
  // 'both'       -> renders in both places
  scope: 'both',

  // Optional. Shown next to the module heading; use it to cite your method.
  source: 'Smith et al. (2025), doi:10.1234/xyz',

  // Required. Resolve whatever the module needs.
  // Throwing (or rejecting) marks the module "not connected" and shows the
  // reason in Analytics → Modules. It never breaks the rest of the UI.
  async load() { /* fetch, validate, cache */ },

  // Optional. Cheap predicate: is there anything to show for this individual?
  // Defaults to true. Must not throw.
  hasData(detail, rowIndex) { return true; },

  // Optional. Return a DOM node or null. Only called when hasData() passed.
  renderIndividual(detail, rowIndex, helpers) { /* ... */ },

  // Optional. Return a DOM node or null, for the Modules tab.
  renderGlobal(helpers) { /* ... */ },
};
```

Register it by adding an entry to `registry.json`:

```json
{
  "id": "archaic-ancestry",
  "path": "modules/archaic-ancestry.js",
  "name": "Archaic ancestry",
  "description": "Shown in the catalogue if the module fails to load.",
  "scope": "both"
}
```

Modules are discovered and loaded at boot, in parallel, after first paint. A
module that 404s, throws, or rejects is reported as disconnected with its error
message — it cannot take down the page.

---

## What `detail` contains

The full per-individual record from `data/detail/NNNN.json`. Useful fields:

| field | meaning |
|---|---|
| `id` / `pid` | AADR genetic ID / master ID — key your data on one of these |
| `i` | row index into the columnar core |
| `group` | AADR Group ID |
| `dateMeanBP`, `dateSdBP`, `dateEarliestBP`, `dateLatestBP` | dating, years BP |
| `directDate` | true when radiocarbon-dated directly |
| `sex`, `morphSex`, `ageText` | biological profile |
| `coverage`, `snps1240k`, `snpsHO`, `snps2M`, `dataType` | data quality |
| `mt`, `mtRoot`, `y`, `yRoot` | uniparental haplogroups |
| `rohSumCM`, `rohNSegments` | runs of homozygosity |
| `contamANGSD`, `contamHapConX`, `damage`, `endogenous` | contamination / damage |
| `region`, `period`, `culture`, `subsistence` | pipeline-derived, each with a `*Src` provenance field |
| `assessment`, `warnings` | AADR curator verdict |
| `doi`, `publication`, `repository` | provenance |

## What `helpers` gives you

```js
helpers.el(tag, props, ...children)   // the same DOM builder the app uses
helpers.icon(paths, size)
helpers.format.{n0,n1,n2,compact,bpToEra,bpLabel}
helpers.colors.{period, clade}
helpers.data.column(name)             // typed array, all 23,089 individuals
helpers.data.decode(name, rowIndex)   // dictionary-coded column -> string
helpers.data.siteMembers(siteId)      // row indices at one site
helpers.data.idOf(rowIndex)
helpers.data.detail(rowIndex)         // async, full record
helpers.data.count()
helpers.unavailable(message, detail)  // the standard "not connected" block
```

Use the app's CSS classes (`metric`, `bar-row`, `callout`, `chart-note`,
`chip`) and your module will match the rest of the interface for free.

Modules must not import from `js/` — that risks a cycle. To navigate, dispatch:

```js
window.dispatchEvent(new CustomEvent('aadr:show-individual', {
  detail: { row: rowIndex },
}));
```

---

## The three shipped modules

| file | state | what it shows |
|---|---|---|
| `roh-context.js` | connected | Percentile of an individual's ROH against contemporaries from the same macro-region, plus a region-level consanguinity comparison. Runs on shipped data — read this one first. |
| `kinship.js` | connected | Parses the AADR "Family relations" free-text field into links to the named relatives. |
| `archaic-ancestry.js` | **disconnected by design** | Reference implementation for a genotype-derived analysis. Ships with no data file so the UI shows what a missing module looks like. |

To connect `archaic-ancestry`, write `web/data/modules/archaic.json`:

```json
{
  "method": "f4-ratio against Vindija 33.19 and Altai Denisovan",
  "citation": "Your pipeline, 2026",
  "unit": "fraction",
  "estimates": {
    "Loschbour.AG": {
      "neanderthal": 0.0213,
      "neanderthal_se": 0.0041,
      "denisovan": 0.0004,
      "denisovan_se": 0.0009,
      "n_informative_sites": 148230
    }
  }
}
```

Reload. It appears in every matching sample panel and in the Modules tab. No
changes anywhere else in the codebase.

---

## Guidance

**Say what your numbers are.** Set `source`, and put the method in the rendered
output. A number with no method attached is worse than no number.

**Show uncertainty.** If you have standard errors or confidence intervals,
render them. `archaic-ancestry.js` shows the pattern.

**Do not interpolate.** If an individual is not in your estimates file, render
nothing for that individual. Never fill a gap with a population mean.

**Fail loudly in `load()`, quietly everywhere else.** A clear error in the
catalogue is useful; a half-rendered panel is not.
