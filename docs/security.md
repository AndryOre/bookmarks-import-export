# Security

This document is the extension's assurance case: what it does and doesn't do
with your data, the threats it's designed against, and where those defenses fall
short today. It's written for users, badge reviewers (OpenSSF Best Practices,
OpenSSF Scorecard), and security researchers. Terms below (root folder, import
mode, Import preview, and so on) follow [`CONTEXT.md`](../CONTEXT.md).

To report a vulnerability, see [`.github/SECURITY.md`](../.github/SECURITY.md)
instead — this document is about the extension's design, not the reporting
process.

## What users can expect

**Local-only, no network, no telemetry.** Every operation reads and writes the
browser's own bookmarks tree through `chrome.bookmarks`. Import and export files
are parsed or generated entirely client-side, inside the extension's own pages
or service worker. The extension makes no network requests of its own, collects
no usage analytics, and has no backend to send data to — see
[`PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) for the user-facing version of this
claim.

**Manifest permissions**, as declared in `wxt.config.ts`, and why each one is
needed:

| Permission         | Why it's needed                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bookmarks`        | Core functionality: read the bookmark tree for export, and create/remove nodes in it for import.                                                                                                           |
| `favicon`          | Reads a bookmark's favicon through Chrome's internal `_favicon` API, which serves the browser's own cached icon for a page. This never makes a network request to the bookmarked site.                     |
| `storage`          | Persists settings (default import mode, auto-export config, last-run status) via `local:`-prefixed `storage.defineItem` keys — never `sync:`-scoped, so settings stay on-device.                           |
| `alarms`           | Schedules auto-export runs (a single one-shot `chrome.alarms` alarm, recomputed after each run) without needing the service worker to stay alive between them.                                             |
| `downloads`        | Saves auto-export files and the Safety snapshot file to the Downloads folder (`browser.downloads.download`), and lets Retention delete Snug's own old auto-export files (`downloads.removeFile`, `erase`). |
| `notifications`    | Shows the Failure notification when an Auto-export run fails. Nothing else is ever notified, and the user can turn it off.                                                                                 |
| `unlimitedStorage` | Lifts the `storage.local` quota so the latest Safety snapshot (a copy of the bookmarks bar and other bookmarks, taken before every Restore-replace) fits even for very large libraries. On-device only.    |
| `offscreen`        | Creates a hidden, unlisted document so the service worker — which has no `document` or `Blob`/URL registry — can turn an in-memory export into a downloadable object URL during auto-export.               |

Manual exports from the popup and the Export page use an `<a download>` link and
do not need `downloads`. No `host_permissions` are declared, and there is no
`tabs` permission: the extension never injects into or reads content from other
pages, and opens its own pages without it. The manifest also sets
`minimum_chrome_version` to 119.

## Threat model and trust boundaries

The extension has two categories of input:

1. **Trusted, browser-mediated input** — the live bookmark tree via
   `chrome.bookmarks`, reached only through Chrome's own extension APIs. This is
   the baseline the extension assumes it can trust.
2. **Untrusted input** — a file the user drops into Quick import or the Import
   page. Its contents are attacker-controlled from the extension's perspective:
   the file could come from an untrusted download, an email attachment, or a
   bookmark export shared by someone else. Every importer (HTML, JSON, CSV,
   XBEL, a Chrome profile `Bookmarks` file, and Safari exports) and
   `lib/import-preview.ts` treat this file's contents as hostile by default.

The trust boundary sits at the file-read step: text read from a dropped file
crosses from "arbitrary bytes" into the extension's parsing logic, and nothing
downstream is allowed to assume that text is well-formed. Nothing crosses back
out — the extension has no network egress, so a hostile import file can only
affect the local bookmark tree it's imported into, never exfiltrate data or
reach another origin.

Within the extension itself, the two runtime contexts (the service worker and
the extension's pages, including the offscreen document — see
[`docs/architecture.md`](architecture.md#runtime-contexts)) are not a security
boundary against each other; they're an API-availability split, not a privilege
split. Both run the extension's own code exclusively.

## Secure-design principles

- **No dangerous DOM sinks.** The HTML importer uses `DOMParser` to parse
  untrusted HTML into a detached, inert document — it never assigns hostile
  content to `innerHTML` or `outerHTML` on a live page, and never calls `eval`
  or a `Function` constructor on file content. React's JSX escapes all rendered
  text by default, so parsed bookmark titles are never interpreted as markup
  when displayed.
- **Least-privilege permissions.** Every manifest permission maps to a single,
  named use (see the table above); there are no `host_permissions`, and nothing
  broader than what each feature needs was requested.
- **Fail closed, not silently corrupt.** A structural parse failure (e.g. the
  browser's bookmarks-bar or "Other bookmarks" root can't be resolved) throws
  and aborts the import rather than writing a partial or malformed tree. See
  "Weaknesses it counters" below for what a _non-structural_ malformed row or
  node does instead.
- **Destructive actions are gated.** Three operations delete things, and each
  one asks first:
  - `restore-replace` import mode deletes the bookmarks bar and other bookmarks.
    It is selectable from both Quick import and the Import page, and can be
    saved as the default import mode, but every replace requires confirming a
    dialog, and a Safety snapshot is saved before anything is deleted (if the
    snapshot fails, nothing is deleted).
  - Deleting duplicates on the Duplicates page removes only the copies marked
    Delete, after a confirmation. It is not undoable and takes no snapshot.
  - Retention deletes old auto-export files, but only downloads Snug itself
    recorded and re-verified as its own (`byExtensionId`), only after a
    successful run, and never when set to 0.
- **On-device storage only.** Settings use `local:`-scoped storage exclusively
  (see the `storage` permission above); nothing syncs to a Google account or any
  remote store.

## Weaknesses it counters

**Malformed or hostile HTML input** (`lib/importers/import-html.ts`): parsed
with `DOMParser`, never `innerHTML`. Bookmark titles are read via `textContent`,
so HTML embedded in a title (e.g. a crafted `<script>` or `<img onerror>`) is
captured as inert text, not executed. A document missing the expected
`<DL>`/`<DT>` structure, or with unknown/extra tags, simply yields fewer or no
parsed nodes rather than throwing — `parseHTML` returns an empty array when it
finds no outer `<dl>` at all. A row with no `href`, or whose `href` fails
`isAllowedBookmarkUrl` validation (`lib/importers/url-validation.ts`, which
requires a `new URL()`-parseable string using an `http:`/`https:`/`ftp:` scheme
— logged via `console.warn` when rejected), becomes a bookmark with no URL and
is silently skipped at write time (see `createBookmarks`, which only creates a
node when `node.url` is set).

**Malformed or hostile JSON input** (`lib/importers/import-json.ts`): a
non-array or deeply nested payload is normalized rather than rejected —
`preprocessBookmarks` walks unknown shapes (a wrapping virtual root, orphaned
nodes, arbitrary extra fields) and classifies whatever it doesn't recognize into
a synthetic "Other bookmarks" node instead of discarding it or throwing. Invalid
JSON syntax is rejected earlier: the caller (the popup's Quick import or the
Import page) parses the raw text with `JSON.parse` and format-detects it before
`importFromJSON` ever runs, so a malformed file never reaches the importer at
all. A node whose `url` field fails `isAllowedBookmarkUrl` validation is treated
the same as a node with no `url` at all (skipped, logged via `console.warn`)
rather than being passed to `browser.bookmarks.create`.

**Malformed or hostile CSV input** (`lib/importers/import-csv.ts`): rows missing
a `title` or `url`, or whose `url` fails `isAllowedBookmarkUrl` validation, are
skipped individually (logged via `console.warn`) without aborting the rest of
the import. Header matching is case-insensitive and trimmed, so inconsistent
casing or whitespace in a hand-edited CSV doesn't cause a false rejection.

**Malformed or hostile XBEL input** (`lib/importers/import-xbel.ts`): the file
must contain an `<xbel>` root and parse as XML with `DOMParser`
(`application/xml`) with no `parsererror`; otherwise it is rejected as
unrecognized. Titles are read as text and never injected as markup. Each `href`
goes through `isAllowedBookmarkUrl`, so non-`http(s)`/`ftp` URLs are dropped.

**Malformed or hostile Chrome profile input**
(`lib/importers/import-chrome.ts`): a `Bookmarks` file is recognized only if
parsed JSON has a `roots` object with a `bookmark_bar` or `other` folder. The
walk reads only the expected fields (`name`, `type`, `url`, dates, `children`)
and ignores everything else, including the profile checksum. Unexpected types
fall back to safe defaults (empty titles, the current time for a bad date), and
every `url` is validated with `isAllowedBookmarkUrl`.

**The Import preview gate** (`lib/import-preview.ts`, surfaced by the Import
page): before anything is written to `chrome.bookmarks`, the dropped file is run
through the same detection and parsing logic the real import would use, purely
to produce counts and a location-data flag — no `chrome.bookmarks` call happens
during preview. `getImportPreview` never throws: a detection or parse failure at
this stage falls through to a zeroed-out preview (format detected, everything
else `0`/`false`) instead of surfacing a raw parser error or silently proceeding
as if the file were valid. This lets the user see, before committing anything,
whether a file parsed as expected (a plausible bookmark count, matching the
format they expected) or clearly didn't — and back out.

## Known limitations

- **No sanitization beyond structural parsing.** Defenses described above rely
  on `DOMParser` never executing content and on `chrome.bookmarks`' own
  validation, not on an extra allowlist/sanitization pass over titles or URLs. A
  future hostile input class not covered by "parse as inert data" is not
  automatically defended against.
- **`restore-replace` is undoable only through the latest Safety snapshot.**
  Before it deletes anything, the extension saves a snapshot (a file in
  Downloads plus one copy in `storage.local`); the Import result's Undo import
  and Settings' Restore snapshot restore it. Only the latest snapshot is kept,
  so an older replace cannot be undone once a newer snapshot exists. The
  snapshot holds the titles and URLs of the user's bookmarks, so it is as
  sensitive as the bookmarks themselves; it never leaves the device.
- **Duplicate deletion and Retention deletes are final.** Neither takes a
  snapshot or can be undone.
- **Single maintainer, no backup reviewer.** There is no second maintainer to
  review security-relevant changes or act as a continuity backup if the primary
  maintainer is unavailable. This is a deliberate, accepted gap for this
  project's size — see `access_continuity` in the OpenSSF Best Practices
  self-assessment.
- **Static analysis covers common sinks, not business logic.** CodeQL
  (`.github/workflows/codeql.yml`, see
  [ADR 0004](adr/0004-enable-codeql-sast.md)) scans for known vulnerability
  patterns such as ReDoS, prototype pollution and incomplete sanitization. It
  doesn't substitute for a manual review of import logic, which is why this
  document exists.
