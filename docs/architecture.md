# Architecture

This document describes the shape of the codebase, not its API. It is allowed to
go stale in the details as the code moves — that's fine, treat it as a map, not
a contract. Names files and symbols directly instead of linking to them, because
links rot and names mostly don't.

## Bird's-eye view

This is a Chrome MV3 extension for importing and exporting bookmarks in HTML
(Netscape bookmark file), JSON, and CSV formats, plus a scheduled auto-export to
the downloads folder. The extension has no backend and no network calls: every
operation reads and writes the browser's own bookmarks tree through
`chrome.bookmarks`, and files are parsed or generated entirely client-side. The
UI is React, split across several small standalone pages (a popup and four
full-tab pages) rather than one single-page app, because each of those surfaces
is opened as its own browser tab or the toolbar popup and has no shared React
tree with the others.

## Code map

### Entrypoints (`entrypoints/`)

- **`background.ts`** — the MV3 service worker. Registers
  `browser.runtime.onInstalled` (opens the welcome or update page, and calls
  `syncAlarm` for every reason so a catch-up run can be armed after an
  install/update), `browser.runtime.onStartup` (also calls `syncAlarm`) and a
  storage watcher on the auto-export config that calls `syncAlarm` only when the
  change affects scheduling (`enabled`/`interval`/`preferredTime`, or `formats`
  crossing the empty/non-empty boundary — a `path`-only or still-non-empty
  `formats` change is ignored), and `browser.alarms.onAlarm` (runs the export,
  telling `runAutoExport` whether this is a `scheduled` or `catch-up` run by
  comparing the alarm's fire time to the stored next-run time). Has no DOM and
  renders nothing.
- **`popup/`** — the toolbar popup. Two tabs (export / import) for the
  common-case flows: pick a format and export the whole tree, or pick a file and
  import it with default settings.
- **`advanced-export/`** — a full tab for selective export: a searchable,
  checkable bookmark tree plus a settings dialog for the options each exporter
  accepts (icons, dates, hiding folders, filename template).
- **`advanced-import/`** — a full tab for import with a preview step: drop a
  file, see counts and whether it carries folder placement, choose an import
  mode, then commit.
- **`update/`** — shown after an extension update; renders the changelog.
- **`welcome/`** — shown on first install; a short feature tour.

### `lib/`

- **Importers** (`lib/importers/import-html.ts`, `import-json.ts`,
  `import-csv.ts`) — each turns one file format into `chrome.bookmarks` API
  calls. HTML and JSON share an internal `ParsedBookmark` tree shape and
  understand the three `ImportMode`s (folder / restore-merge / restore-replace).
  Both also share `lib/importers/resolve-roots.ts`'s `resolveImportRoots` to
  locate the bookmarks-bar/Other/Mobile roots to write into — see Invariants.
  CSV is flat rows with an optional `folder` path column and only ever imports
  into a single deduplicated folder — it has no mode selector because it has no
  bar/other placement to restore.
- **Exporters** (`lib/exporters/export-html.ts`, `export-json.ts`,
  `export-csv.ts`) — each turns a `chrome.bookmarks` subtree (or the whole tree)
  into a file's text content. All three accept a `selectedBookmarks` option (a
  pruned subtree from the advanced-export tree, or `null` for "the whole tree").
- **`detect-format.ts`** — sniffs a file's format from its MIME type plus a
  structural check (JSON parses, HTML starts with the Netscape doctype, CSV has
  `title`/`url`-ish headers), returning `'unknown'` on no match.
- **`import-preview.ts`** — runs a file through the same parsing the real
  importer would use, without touching `chrome.bookmarks`, to produce counts and
  an `hasLocationData` flag for the advanced-import preview panel.
- **`filename-template.ts`** — expands `%yyyy`/`%mm`/`%dd`/`%hh`/`%min`/ `%sec`
  placeholders against a `Date` and sanitizes the result for filesystem-unsafe
  characters. Shared by every export path (popup, advanced-export, auto-export)
  so all three name files the same way.
- **`favicon.ts`** — fetches a page's favicon and returns it as base64, for the
  optional `iconData` export column/field.
- **`auto-export.ts`** — owns the alarm lifecycle (`syncAlarm`, which keeps a
  single one-shot `browser.alarms` alarm — not `periodInMinutes`, which drifts
  across DST — armed at the next due time; `computeNextRun`, the pure function
  behind that due time) and the run itself (`runAutoExport`, which calls the
  three exporters, hands each result to `browser.downloads.download`, records
  the outcome, and reschedules). See Data flows for the full next-run-store/
  catch-up/badge model.
- **`storage.ts`** — every persisted setting and its default, as
  `storage.defineItem` calls from `wxt`'s storage wrapper.
- **`use-storage-item.ts`** — a React hook that subscribes an exported store to
  component state.
- **`types.ts`** — the shared type vocabulary: `BookmarkNode`,
  `ExtendedBookmarkTreeNode`, `ParsedBookmark`, `BookmarkFormat`, `ImportMode`,
  `AutoExportConfig`, `ImportPreview`, `CheckedState`, and the component prop
  interfaces for the advanced-export tree.
- **`changelog.ts`** — the ordered list of release entries the update page
  renders, each pointing at i18n message keys rather than embedding text
  directly.

### Components (`components/`)

- **`components/advanced-export/`** — `bookmark-tree.tsx` (the checkable tree,
  exposing a `BookmarkTreeHandle` for select-all/deselect-all/refresh/
  get-selected), plus its `header.tsx`, `search-bar.tsx`, and
  `settings-dialog.tsx`.
- **`components/advanced-import/`** — `file-drop-zone.tsx`,
  `import-mode-selector.tsx`, `import-preview.tsx`, and `header.tsx`.
- **`components/ui/`** — the shadcn/ui-generated primitives (`button.tsx`,
  `dialog.tsx`, `select.tsx`, etc.). Generated registry code; not hand-authored,
  not covered by the rest of this map's conventions.
- Top-level: `advanced-export-button.tsx`, `advanced-import-button.tsx`,
  `import-bookmarks-button.tsx`, `export-format-selector.tsx`,
  `feature-card.tsx`, `theme-provider.tsx`.

## Runtime contexts

MV3 splits this extension across two different JavaScript environments, and the
API surface available differs between them:

- **The service worker** (`background.ts`) has no `window`, no `document`, and
  is torn down and restarted freely by Chrome between events. It can call
  `chrome.bookmarks`, `chrome.alarms`, `chrome.downloads`, and `chrome.storage`,
  but has no DOM.
- **Extension pages** (popup, advanced-export, advanced-import, update, welcome)
  are ordinary web pages with a full DOM, rendered as React trees.

Two APIs used by the importers/exporters are page-only and unavailable to the
service worker, which is why `auto-export.ts` cannot reuse the same download
mechanism the pages use:

- **`DOMParser`** (used by `parseHTML` in `import-html.ts`) needs a document
  context to parse HTML strings into a traversable tree. It does not exist in a
  service worker.
- **`URL.createObjectURL`** (used by the popup and advanced-export pages to turn
  an in-memory `Blob` into a downloadable `<a href>`) requires a `Blob`/URL
  registry tied to a document; a service worker has neither. This is why
  `runAutoExport` in `auto-export.ts` instead base64-encodes the export content
  into a `data:` URL and hands that directly to `browser.downloads.download` — a
  mechanism that works with no document at all.

## Data flows

**Import** (advanced-import page): a dropped file is read as text, then
`getImportPreview` (detect format → attempt the real parse without writing
anything) produces counts and a location-data flag for the preview panel. The
user picks an `ImportMode`; `restore-replace` is gated behind a confirmation
dialog because it deletes existing bookmarks first. On confirm, `detectFormat`
runs again and the matching importer
(`importFromHTML`/`importFromJSON`/`importFromCSV`) writes directly to
`chrome.bookmarks`.

**Export** (popup and advanced-export pages): the advanced-export page's
bookmark tree produces a selection (or the popup exports the whole tree by
passing `selectedBookmarks: null`); the chosen exporter turns that into a
format's text content; the page wraps it in a `Blob`, turns that into an object
URL, and triggers a browser download via a synthetic `<a>` click.

**Auto-export** (background service worker): the authoritative next due time
lives in `autoExportNextRunStore` (epoch milliseconds, or `null` when disabled),
not derived from a periodic alarm — `syncAlarm` computes it with
`computeNextRun` (a pure function using `Date`'s local-time setters, so it lands
on the right wall-clock time across a DST transition instead of drifting) and
arms a single **one-shot** `chrome.alarms` alarm (`ALARM_NAME`, scheduled with
`when`, never `periodInMinutes`) at it. `syncAlarm` runs on four distinct
triggers: a scheduling-relevant config change (recompute from now and
store/arm), and startup/install/update (read the stored next run instead of
recomputing — computing one only if it's missing — and, if it's already in the
past, arm a **catch-up** alarm about a minute out rather than firing
immediately, without touching the stored due time). When the alarm fires, the
listener tells `runAutoExport` whether it's a `scheduled` or `catch-up` run (by
comparing the alarm's fire time to the stored next run) or a `manual` one (a
later ticket's "Export now" button calls it directly). `runAutoExport` reads the
persisted export settings, runs whichever exporters are enabled in the config,
base64-encodes each result into a `data:` URL, and calls
`browser.downloads.download` directly — skipping the `Blob`/object-URL step the
page-based exports use, since neither is available in the service worker. It
then records the outcome in `autoExportLastRunStore` as
`{ at, ok, error?, trigger }` (a legacy plain-number value from before this
shape existed is migrated on read to a successful `scheduled` run), and — for
`scheduled`/`catch-up` triggers only — recomputes the next due time anchored to
this run's completion and re-arms the alarm, so a run always reschedules even if
it failed. On a failed `scheduled`/`catch-up` run it also sets a toolbar failure
badge (`chrome.action.setBadgeText('!')` plus a destructive-colored background);
the next run that succeeds, on any trigger, clears it.

## Invariants

- Chrome's bookmark tree root node ids are fixed and always the same: `"0"` is
  the invisible root, `"1"` is the bookmarks bar, `"2"` is "other bookmarks",
  and `"3"` is Mobile bookmarks (present only on browsers that have a Mobile
  root). Restore-mode importers never look these roots up positionally
  (`root.children[0]`/`[1]`) — both the HTML and JSON write paths resolve them
  through the shared `resolveImportRoots` helper
  (`lib/importers/resolve-roots.ts`), in order: the node's `folderType`
  (`"bookmarks-bar"`/`"other"`/`"mobile"`, a newer Chrome API not yet present on
  every channel), then the fixed id, then position. `mobileId` resolves to
  `undefined` when none of the three match (e.g. desktop Chrome, which has no
  Mobile root) — callers must treat that as "no Mobile root", not a structural
  failure; only a missing bookmarks-bar or other-bookmarks root is one.
- Timestamps are stored in **seconds** in every exported/imported file format
  (HTML's `add_date`/`last_modified` attributes, and the CSV
  `dateAdded`/`dateLastUsed` columns), while `chrome.bookmarks`' own API returns
  and accepts **milliseconds**. Every importer multiplies by 1000 on the way in;
  every exporter divides by 1000 (`Math.floor`) on the way out.
- The bookmarks-bar and other-bookmarks folder names are localized
  (`i18n.t('bookmarksBar')` / `i18n.t('otherBookmarks')`), not hardcoded English
  strings. This affects both what CSV export writes into its `folder` column for
  those two roots, and what the CSV importer searches for when deduplicating its
  "Imported Bookmarks" destination folder across repeated imports.
- CSV never carries bar/other-bookmarks placement: its `ImportPreview` always
  reports `hasLocationData: false`, so the import-mode selector only offers
  "folder" mode for CSV files, never a restore mode.
- `restore-replace` import mode is destructive: it calls
  `chrome.bookmarks.removeTree` on every existing bookmarks-bar and
  other-bookmarks child before writing the imported tree in their place. There
  is no undo.
- All persisted settings go through `storage.defineItem` with a
  `local:`-prefixed key (`lib/storage.ts`) — there is no `sync:`-scoped storage
  anywhere in this codebase.
