# Glossary

Terms used consistently across this project's code, docs, and UI. This is a
glossary of concepts, not an implementation reference — it defines what things
mean, not how they're built.

**Snug** The product's name, shown as "Snug" in every locale and never
translated. The repository slug and package name are `snug`; only the Chrome Web
Store extension ID keeps the legacy identity. _Avoid_: Bookmark Import/Export,
Importar/Exportar Marcadores, BIE, `bookmarks-import-export`.

**Wordmark** The product name rendered as brand text next to the mark: "Sn" in
the amber brand text gradient, "ug" in the normal text color. Used only on the
App sidebar header and the Welcome hero, never on controls. _Avoid_: logo text,
title, brand text.

**App** The extension's single full-page UI (`app.html`, also the options page),
hash-routed with a sidebar: Export, Import, Duplicates, Auto-export, Settings,
What's new and Welcome. The popup is separate and compact; anything that needs
more room opens the App. _Avoid_: dashboard, options page, advanced page, full
page.

**Bookmark node** A single entry in a bookmark tree: either a bookmark (has a
title and a URL) or a folder (has a title and children, no URL). Trees are built
from nodes nested inside other nodes. _Avoid_: bookmark item, entry, record.

**Root folder** One of the fixed top-level folders every bookmark tree has: the
bookmarks bar, "other bookmarks", and — where the browser provides it — "mobile
bookmarks". Every import and export operates relative to these, and their names
are shown in the browser's own language rather than a fixed English label.
_Avoid_: toolbar folder, top-level folder, root node.

**Location data** Information about which root folder (bookmarks bar, other
bookmarks, or mobile bookmarks) a bookmark or folder belongs to. Some import
formats carry it and some don't; its presence determines which import modes are
offered. _Avoid_: placement, position data, folder assignment.

**Import mode** The strategy used when bringing bookmarks into the browser.
Three modes exist: Folder (add everything into one new folder, leaving existing
bookmarks untouched), Restore-merge (add imported bookmarks directly into the
bookmarks bar and other-bookmarks roots, alongside what's already there), and
Restore-replace (clear the bookmarks bar and other-bookmarks roots first, then
add the imported bookmarks in their place). _Avoid_: import strategy, import
type, merge mode.

**Default import mode** The import mode the user has chosen to apply by default,
remembered between sessions and shared by Quick import and the Import page.
Formats without location data always import in Folder mode regardless. _Avoid_:
preferred mode, saved mode.

**Quick import** Importing a file directly from the popup in one step, using the
default import mode and committing immediately, as opposed to the Import page's
preview-first flow, which shows the Import preview and lets the user choose a
mode before anything changes. _Avoid_: basic import, simple import, popup
import.

**Import preview** A summary shown before committing an import: how many
bookmarks were found, split by root folder, and whether the file carries
location data at all. Lets the user judge a file before it changes anything.
_Avoid_: import summary, pre-import check, dry run.

**Export selection** The subset of bookmarks a user has explicitly checked in
the Export page's bookmark tree, as opposed to exporting the entire bookmark
collection at once. A selection can mix individual bookmarks and whole folders.
_Avoid_: Advanced Export selection, export scope, checked bookmarks, chosen
items.

**Export options** The per-export switches that shape a file's content: whether
to include icons and which dates, whether to hide the "other bookmarks" and
parent folders, and the filename template. They are shared by the Export page
and the Auto-export page. _Avoid_: export settings, export preferences.

**Safety snapshot** A copy of the bookmarks bar and other-bookmarks roots that
Snug takes automatically before every Restore-replace, kept both as a file in
the user's downloads and inside the extension so the import can be undone. Only
the latest one is kept. _Avoid_: backup, restore point, undo file.

**Duplicate** Two or more bookmarks whose URLs are the same once normalized:
scheme and host lowercased, `http` treated as `https`, a leading `www.`, a
trailing slash and any `#fragment` ignored. Folders are never duplicates of each
other. _Avoid_: dupe, repeated bookmark, copy.

**Skip duplicates** An import option that leaves out any bookmark whose
normalized URL already exists in the browser, reporting how many were skipped.
On by default in Folder and Restore-merge. _Avoid_: dedupe on import, merge
duplicates, ignore existing.

**Auto-export** A recurring, unattended export that runs on a schedule the user
configures (how often — hourly, every 12 hours, daily, every 3 days, every 7
days, or weekly on a chosen day — and to which formats), saving files without
any manual export action. _Avoid_: scheduled export, automatic backup,
background export.

**Retention** How many Auto-export files Snug keeps: after a successful run it
deletes the oldest files it created itself beyond the user's limit, and never
touches files it did not create. _Avoid_: cleanup, rotation, pruning.

**Filename template** A user-configurable pattern for naming exported files,
made of placeholders that get replaced with parts of the current date and time
when a file is generated. _Avoid_: naming pattern, filename format, export
filename.

**Auto-export run** One execution of auto-export, whether scheduled, a catch-up
run, or triggered with Export now; its time and outcome form the last run
status. _Avoid_: backup, job.

**Catch-up run** An auto-export run performed shortly after the browser starts
because its scheduled time passed while the browser was closed. _Avoid_: missed
run, retry.

**Failure notification** The system notification Snug shows when an Auto-export
run fails; successful runs never notify. _Avoid_: alert, error toast, warning.
