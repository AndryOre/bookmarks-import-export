# Glossary

Terms used consistently across this project's code, docs, and UI. This is a
glossary of concepts, not an implementation reference — it defines what things
mean, not how they're built.

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
remembered between sessions and shared by quick import and Advanced Import.
Formats without location data always import in Folder mode regardless. _Avoid_:
preferred mode, saved mode.

**Quick import** Importing a file directly from the popup in one step, using the
default import mode, as opposed to the Advanced Import page's preview-first
flow. _Avoid_: basic import, simple import, popup import.

**Import preview** A summary shown before committing an import: how many
bookmarks were found, split by root folder, and whether the file carries
location data at all. Lets the user judge a file before it changes anything.
_Avoid_: import summary, pre-import check, dry run.

**Advanced Export selection** The subset of bookmarks a user has explicitly
checked in the advanced export view, as opposed to exporting the entire bookmark
collection at once. A selection can mix individual bookmarks and whole folders.
_Avoid_: export scope, checked bookmarks, chosen items.

**Auto-export** A recurring, unattended export that runs on a schedule the user
configures (how often, and to which formats), saving files without any manual
export action. _Avoid_: scheduled export, automatic backup, background export.

**Filename template** A user-configurable pattern for naming exported files,
made of placeholders that get replaced with parts of the current date and time
when a file is generated. _Avoid_: naming pattern, filename format, export
filename.
