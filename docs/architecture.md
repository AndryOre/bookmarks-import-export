# Architecture

This document describes the shape of the codebase, not its API. It is allowed to
go stale in the details as the code moves — that's fine, treat it as a map, not
a contract. Names files and symbols directly instead of linking to them, because
links rot and names mostly don't.

## Bird's-eye view

This is a Chrome MV3 extension for importing and exporting bookmarks in many
formats (HTML, JSON, CSV, Markdown, OPML and XBEL out; HTML, JSON, CSV, XBEL, a
Chrome profile `Bookmarks` file and Safari exports in), plus a scheduled
auto-export to the downloads folder. The extension has no backend and no network
calls: every operation reads and writes the browser's own bookmarks tree through
`chrome.bookmarks`, and files are parsed or generated entirely client-side. The
UI is React, in two surfaces: a compact toolbar popup, and one hash-routed
full-page App (`app.html`) holding every larger screen. They are separate
entrypoints with no shared React tree; the popup links into the App for anything
that needs more room. See [`docs/security.md`](security.md) for the assurance
case behind the no-network/local-only claim above, the manifest permissions, and
the threat model.

## Code map

### Entrypoints (`entrypoints/`)

- **`background.ts`** — the MV3 service worker. Registers
  `browser.runtime.onInstalled` (opens the App's Welcome or What's new route,
  and calls `syncAlarm` for every reason so a catch-up run can be armed after an
  install/update), `browser.runtime.onStartup` (also calls `syncAlarm`) and a
  storage watcher on the auto-export config that calls `syncAlarm` only when the
  change affects scheduling (`enabled`/`interval`/`preferredTime`, or `formats`
  crossing the empty/non-empty boundary — a `path`-only or still-non-empty
  `formats` change is ignored), and `browser.alarms.onAlarm` (runs the export,
  telling `runAutoExport` whether this is a `scheduled` or `catch-up` run by
  comparing the alarm's fire time to the stored next-run time). Has no DOM and
  renders nothing.
- **`popup/`** — the toolbar popup: one compact screen with an export section
  (format + "Export all"), an import section (Quick import with the default
  mode), an auto-export status row and a footer that opens the App. It shares no
  React tree with the App.
- **`app/`** — the single full-page App (`app.html`, also the manifest's
  `options_ui` page, opened in a tab). A hash-routed shell built on TanStack
  Router (`router.tsx`, hash history, see
  [ADR 0006](adr/0006-single-app-hash-routed-shell.md)) with a sidebar
  (`app-shell.tsx`, `nav.ts`) and one route module per screen under `routes/`:
  Export (searchable, virtualized checkable bookmark tree plus the Export
  options panel), Import (file, import mode, then a preview-first commit),
  Duplicates (scan and delete duplicate bookmarks), Auto-export (status,
  schedule, Export now), Settings (theme, tree display, default import mode,
  Safety snapshot restore), What's new (changelog) and Welcome (first-install
  tour). The sidebar lists every route except Welcome. On each navigation the
  shell moves focus to the page's `h1` and announces the new title. Route paths
  live in `lib/app-url.ts` (`APP_ROUTES`, `getAppUrl`) so the popup, background
  and changelog deep-link with `app.html#/<route>`.
- **`offscreen/`** — the hidden document used for blob downloads (see Runtime
  contexts).
- **`advanced-export/`, `advanced-import/`, `update/`, `welcome/`** — the legacy
  v1 pages. Each is only a stub whose `main.ts` calls `redirectToApp` with the
  App route that replaced it (Export, Import, What's new, Welcome), so old links
  and bookmarks still land somewhere useful. The v1 deep link
  `?settings=auto-export` maps to the Auto-export route.
  `lib/legacy-redirect.ts` holds the shared logic. This is the single exception
  to the one-App rule, see [ADR 0007](adr/0007-legacy-page-redirects.md).

### `lib/`

- **Importers** (`lib/importers/import-html.ts`, `import-json.ts`,
  `import-csv.ts`, plus the source parsers `import-xbel.ts`, `import-chrome.ts`
  and `import-safari.ts`) — each turns one file format into `chrome.bookmarks`
  API calls. The XBEL, Chrome profile and Safari parsers produce the same
  `ParsedBookmark` tree as HTML and JSON, and `parse-import.ts`
  (`parseLocationAwareImport`) picks the parser for a detected format. Chrome
  `Bookmarks` timestamps (WebKit epoch microseconds) are converted to Unix
  milliseconds on the way in. The location-aware formats understand the three
  `ImportMode`s (folder / restore-merge / restore-replace). Both also share
  `lib/importers/resolve-roots.ts`'s `resolveImportRoots` to locate the
  bookmarks-bar/Other/Mobile roots to write into — see Invariants. CSV is flat
  rows with an optional `folder` path column and only ever imports into a single
  deduplicated folder — it has no mode selector because it has no bar/other
  placement to restore.
- **Exporters** (`lib/exporters/export-html.ts`, `export-json.ts`,
  `export-csv.ts`, `export-markdown.ts`, `export-opml.ts`, `export-xbel.ts`) —
  each turns a `chrome.bookmarks` subtree (or the whole tree) into a file's text
  content. All accept a `selectedBookmarks` option (a pruned subtree from the
  Export page's tree, or `null` for "the whole tree"). `lib/export-formats.ts`
  lists the six formats with their extension and MIME type, `render-export.ts`
  dispatches to the right exporter, and `export-control.ts` carries the progress
  callback and abort signal every exporter honors. Markdown and OPML are
  export-only.
- **`detect-format.ts`** — detects a file's format by MIME type, then file
  extension, then content sniffing, validating each candidate against the
  content (JSON parses, HTML starts with the Netscape doctype, XBEL is
  well-formed XML with an `xbel` root, CSV has `title`/`url`-ish headers). It
  also refines JSON into a Chrome profile file and HTML into a Safari export.
  Returns `'unknown'` on no match.
- **`run-import.ts`** — the import entry point shared by Quick import and the
  Import page: detects the format, applies Skip duplicates, takes the Safety
  snapshot before a Restore-replace, and runs the importer with the progress
  callback and abort signal (`import-control.ts`).
- **`duplicates.ts`** — URL normalization and `findDuplicateGroups` for the
  Duplicates page, oldest copy first. `skip-duplicates.ts` reuses the same
  normalization to drop bookmarks that already exist (never in Restore-replace),
  and `import-duplicates.ts` summarizes the effect for the Import page.
- **`safety-snapshot.ts`** — captures the two roots, saves them as a JSON file
  through the offscreen download and keeps the latest one in
  `local:safetySnapshot`. See Invariants.
- **`replace-diff.ts`** — the removed/added counts the Import page shows before
  a Restore-replace.
- **`import-preview.ts`** — runs a file through the same parsing the real
  importer would use, without touching `chrome.bookmarks`, to produce counts and
  an `hasLocationData` flag for the Import page's preview.
- **`filename-template.ts`** — expands `%yyyy`/`%mm`/`%dd`/`%hh`/`%min`/ `%sec`
  placeholders against a `Date` and sanitizes the result for filesystem-unsafe
  characters. Shared by every export path (popup, Export page, auto-export) so
  all three name files the same way.
- **`favicon.ts`** — fetches a page's favicon and returns it as base64, for the
  optional `iconData` export column/field.
- **`auto-export-retention.ts`** and **`auto-export-notification.ts`** — the
  steps `runAutoExport` runs after an outcome: Retention, and the Failure
  notification. See Data flows.
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
- **`tree-navigation.ts`** — pure helpers behind the Export tree's keyboard
  support: flattening the visible rows with their ARIA level/position, and
  mapping an arrow/Home/End key to a focus, expand or collapse action.
- **`types.ts`** — the shared type vocabulary: `BookmarkNode`,
  `ExtendedBookmarkTreeNode`, `ParsedBookmark`, `BookmarkFormat`, `ImportMode`,
  `AutoExportConfig`, `ImportPreview`, `CheckedState`, and the component prop
  interfaces for the Export page's tree.
- **`changelog.ts`** — the ordered list of release entries the What's new route
  renders, each pointing at i18n message keys rather than embedding text
  directly.

### Components (`components/`)

- **`components/export/`** — the Export page's pieces: `bookmark-tree.tsx` (the
  WAI-ARIA tree, exposing a `BookmarkTreeHandle` for select-all/deselect-all/
  refresh/get-selected), `export-toolbar.tsx`, `export-bar.tsx` and
  `export-tree-states.tsx` (loading/no-bookmarks/load-error/no-results).
- **`components/import/`** — the Import page's steps: `import-file-step.tsx`,
  `import-mode-step.tsx`, `import-preview-step.tsx` and the `import-step.tsx`
  wrapper.
- **`components/duplicates/`** — the Duplicates page's group card.
- **`components/popup/`** — the popup's `export-section.tsx`,
  `import-section.tsx`, `auto-export-status-item.tsx` and `footer.tsx`.
- **`components/ui/`** — the shadcn/ui-generated primitives (`button.tsx`,
  `dialog.tsx`, `select.tsx`, etc.). Generated registry code; not hand-authored,
  not covered by the rest of this map's conventions.
- Top-level: `export-options-panel.tsx` (the shared **Export options** panel),
  `time-picker.tsx` (locale-aware) and `theme-provider.tsx`.

## Runtime contexts

MV3 splits this extension across two different JavaScript environments, and the
API surface available differs between them:

- **The service worker** (`background.ts`) has no `window`, no `document`, and
  is torn down and restarted freely by Chrome between events. It can call
  `chrome.bookmarks`, `chrome.alarms`, `chrome.downloads`,
  `chrome.notifications`, and `chrome.storage`, but has no DOM.
- **Extension pages** (the popup and the App) are ordinary web pages with a full
  DOM, rendered as React trees.
- **The offscreen document** (`entrypoints/offscreen`) is an unlisted, hidden
  page the service worker creates on demand via `chrome.offscreen`. It exists
  purely to provide a document context for `URL.createObjectURL`.

Two APIs used by the importers/exporters are page-only and unavailable to the
service worker, which is why `auto-export.ts` cannot reuse the same download
mechanism the pages use directly:

- **`DOMParser`** (used by `parseHTML` in `import-html.ts`) needs a document
  context to parse HTML strings into a traversable tree. It does not exist in a
  service worker.
- **`URL.createObjectURL`** (used by the popup and the Export page to turn an
  in-memory `Blob` into a downloadable `<a href>`) requires a `Blob`/URL
  registry tied to a document; a service worker has neither. `runAutoExport` in
  `auto-export.ts` works around this via `downloadViaOffscreenDocument`
  (`lib/offscreen-download.ts`): it opens the offscreen document (reusing one
  already open from another format in the same run), messages it the export
  content and MIME type, and gets back a `Blob` object URL created inside that
  document. `browser.downloads.download` then downloads that URL directly. Once
  the download reaches `'complete'` or `'interrupted'`, the object URL is
  revoked and — once no other download from the run is still pending — the
  offscreen document is closed.

## Data flows

**Navigation** (popup, background, App): every deep link is
`getAppUrl(APP_ROUTES.<route>)` (`lib/app-url.ts`), i.e. `app.html#/<route>`.
The background opens `#/welcome` on install and `#/whats-new` on update; the
popup footer opens the App. Inside the App, the sidebar and in-page links
navigate through the hash router, and the shell scrolls its content area back to
the top on each navigation. The manifest's options page opens `app.html` with no
hash, so the router's index route redirects it to `#/export`.

**Import** (Import page): a dropped file is read as text, then
`getImportPreview` (detect format → attempt the real parse without writing
anything) produces counts and a location-data flag for the preview panel. The
user picks an `ImportMode`; `restore-replace` is gated behind a confirmation
dialog because it deletes existing bookmarks first. For a `restore-replace`,
`getReplaceDiff` also shows how many bookmarks will be removed and added. On
confirm, `runImport` detects the format again, drops bookmarks that already
exist when Skip duplicates is on (not for `restore-replace`), takes the Safety
snapshot first for `restore-replace`, and the matching importer writes directly
to `chrome.bookmarks`. An `ImportWriter` journals every node it creates and
reports progress per batch; aborting the signal removes those nodes again (and,
if a Restore-replace had already cleared the roots, restores the Safety
snapshot) and throws `ImportCanceledError`. After a replace, the Import result
offers Undo import, which restores the snapshot.

**Export** (popup and Export page): the Export page's bookmark tree produces a
selection (or the popup exports the whole tree by passing
`selectedBookmarks: null`); the chosen exporter turns that into a format's text
content; the page wraps it in a `Blob`, turns that into an object URL, and
triggers a browser download via a synthetic `<a>` click. Every exporter ticks
once per bookmark, which drives the progress card and lets Cancel abort the
export before any file is produced.

**Duplicates** (Duplicates page): `findDuplicateGroups` walks the live tree and
groups bookmarks by normalized URL. The page keeps the oldest copy of each group
by default and removes the copies marked Delete after a confirmation. No Safety
snapshot is taken for this.

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
comparing the alarm's fire time to the stored next run) or a `manual` one (the
Auto-export page's "Export now" button messages the background to call it).
`runAutoExport` reads the persisted export settings, runs whichever exporters
are enabled in the config, and downloads each result via
`downloadViaOffscreenDocument` — delegating the `Blob`/object-URL step the
page-based exports do inline to the offscreen document, since the service worker
has neither `Blob` nor a `URL` registry of its own. It then records the outcome
in `autoExportLastRunStore` as `{ at, ok, error?, trigger }` (a legacy
plain-number value from before this shape existed is migrated on read to a
successful `scheduled` run), and — for `scheduled`/`catch-up` triggers only —
recomputes the next due time anchored to this run's completion and re-arms the
alarm, so a run always reschedules even if it failed. On a failed
`scheduled`/`catch-up` run it also sets a toolbar failure badge
(`chrome.action.setBadgeText('!')` plus a destructive-colored background); the
next run that succeeds, on any trigger, clears it. After a successful run,
Retention (`applyRetention`) keeps only the newest `keepLast` files: every
download Snug saves has its id recorded in `autoExportDownloadIdsStore`, and the
oldest ids beyond the limit are checked to still be Snug's own (`byExtensionId`)
before `downloads.removeFile` and `downloads.erase` run. A missing file is
skipped, `0` keeps everything, and a failed run deletes nothing. On any failed
run, manual included, `notifyAutoExportFailure` shows the Failure notification
(fixed id, so repeats replace it) unless the user turned it off; the
background's `notifications.onClicked` listener opens the Auto-export page. The
interval can be hourly, 12 hours, daily, 3 days or weekly (`7d`, on
`dayOfWeek`).

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
  other-bookmarks child before writing the imported tree in their place. A
  Safety snapshot is taken first (`lib/safety-snapshot.ts`), and the Import
  result's Undo import and the Settings Safety snapshot card restore it. The
  snapshot is written as a file first and only then stored, so a failed download
  leaves the previous one intact; if it fails, nothing is deleted. There is no
  undo for anything else: deleting duplicates and retention deletes are final.
- Only the latest Safety snapshot is kept, in `local:safetySnapshot` (hence the
  `unlimitedStorage` permission). Retention only ever touches downloads whose
  recorded id still belongs to this extension.
- All persisted settings go through `storage.defineItem` with a
  `local:`-prefixed key (`lib/storage.ts`) — there is no `sync:`-scoped storage
  anywhere in this codebase.
