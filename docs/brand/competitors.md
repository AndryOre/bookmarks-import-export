# Competitor analysis — Chrome bookmark export/import extensions

Scope: direct competitors (bookmark export/import utilities), not general
bookmark managers (Raindrop.io, Workona, Diigo — different category, skipped).

## Our own current listing (baseline)

- **Name:** Bookmark Import/Export (by AndryOre)
- **Rating:** 4.72 / 5, 18 reviews
- **Positioning:** exports from specific folders, cross-browser, HTML output
  plus other export options
- **Complaints:** no visual feedback when an export completes; exported filename
  isn't date-stamped

## Direct competitors

| Name                                                        | Users  | Rating   | Icon                                    | Positioning                                                                                                                             | Complaints / gaps                                                                                                                                          |
| ----------------------------------------------------------- | ------ | -------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bookmarks Exporter** (oneryx)                             | 2,000  | 5.0 (7)  | geometric logo, no distinct brand color | Flattens bookmarks to JSON/CSV, folders become tags — targets Notion/Excel/DB imports, not browser-to-browser                           | No reviews visible; last updated 2022 — stale, niche flatten-to-tags use case only                                                                         |
| **Bookmarks folder exporter & importer** (Kostiantyn Rypta) | 107    | 5.0 (1)  | generic folder icon                     | Export/import selected folders to a text file; also saves open tabs to a folder                                                         | Tiny user base, barely reviewed, plain generic icon/name — no brand identity at all                                                                        |
| **Export Selective Bookmarks**                              | ~5,000 | 4.2 (48) | colorful generic logo                   | Select any part of the bookmark tree, export to Chrome-compatible HTML; pitched for sharing a subset without exposing the whole library | 4.2 is the lowest rating among the live, maintained options — folder-tree UX likely friction point                                                         |
| **Bookmark Folder Import & Export**                         | 361    | 5.0 (1)  | blue folder + link icon                 | Exact-folder mode, grouped TXT output, search/filter, dedup, TXT+CSV, fully local                                                       | Very low adoption despite richer feature list — discoverability/naming problem, not a quality one                                                          |
| **Selective Bookmarks Export Tool**                         | 10,000 | 4.9 (47) | blue/teal bookmark+document icon        | Export chosen bookmarks to HTML, customizable structure, keyword filter, dark mode                                                      | Strongest direct competitor by reach+rating; open source (MIT); EN/中文 only — no other i18n                                                               |
| **101 Export History/Bookmarks to JSON/CSV\*/XLS\***        | 30,000 | 3.1 (71) | colorful generic logo                   | Exports history _and_ bookmarks to JSON; CSV/XLS needs a separate desktop converter                                                     | Lowest rating of the set — direct CSV/XLS claimed in the name but not actually delivered in-extension; history feature capped at 3 months by Chrome itself |

## Takeaways for naming/positioning

- Every direct competitor uses a **literal, generic, unbranded name**
  ("Bookmarks Exporter", "Export Selective Bookmarks", "101 Export..."). None
  has a proper brand identity, icon system, or voice — this is the open gap.
- The best-performing one (**Selective Bookmarks Export Tool**, 10k/4.9) wins on
  scope-control (pick exactly what to export) and polish (dark mode, i18n), not
  on branding — branding is genuinely unclaimed territory in this niche.
- The worst-performing one (**101 Export...**, 3.1) over-promises in its name
  (CSV/XLS) and under-delivers in-product — a lesson for our own CWS descriptor:
  never name a format/feature we don't ship directly.
- Our own current gaps (no completion feedback, no date-stamped filename) are
  real UX fixes to fold into the apply-spec, independent of rebrand — none of
  the competitors above solve these either, so fixing them is a differentiator,
  not table stakes we're behind on.
- No competitor frames itself as part of a **creator's own tool family** (the
  "by Andry Orellana" / AndryOre endorsed-brand angle) — this is unclaimed and
  consistent with the brief's emotional promise.
