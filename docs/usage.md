# Usage

## Opening the app

Click the extension icon to open the popup, then "Open app" for the full-page
app (also reachable from the browser's extension options). A sidebar switches
between **Export**, **Import**, **Duplicates**, **Auto-export**, **Settings**
and **What's new**. The **Welcome** tour opens on first install. Pages from
older versions of Snug redirect to the matching App page, so old bookmarks to
them keep working.

## Exporting bookmarks

1. Quick export: in the popup, pick a format and click "Export all" to export
   your whole bookmark tree.
2. For control over what is exported, open the app's **Export** page:
   - Use the search box to find specific bookmarks.
   - Check individual bookmarks or whole folders (or use "Select all").
   - Adjust the **Export options** panel (favicons, dates, hiding folders,
     filename template).
   - Choose the export format and click "Export N bookmarks".

### Export formats

Snug exports six formats:

| Format   | Extension | Good for                                                    |
| -------- | --------- | ----------------------------------------------------------- |
| HTML     | `.html`   | Importing into any browser (Netscape bookmarks file).       |
| JSON     | `.json`   | Restoring into Snug with folders and root locations intact. |
| CSV      | `.csv`    | Spreadsheets; one row per bookmark with a `folder` column.  |
| Markdown | `.md`     | Notes and wikis; folders become headings and lists.         |
| OPML     | `.opml`   | Feed readers and outliners.                                 |
| XBEL     | `.xbel`   | Other bookmark managers that read the XML bookmark format.  |

Markdown and OPML are export-only: Snug cannot import them back.

### Progress and Cancel

A long export or import shows a progress card with a running count. Click
**Cancel** to stop. A canceled export downloads no file. A canceled import
removes the bookmarks it had already added, and a canceled Restore — replace
puts your previous bookmarks back from the Safety snapshot.

## Naming exported files

By default, exported files are named "Bookmarks". To customize this:

1. Open the app's **Export** page (the same panel appears on **Auto-export**).
2. In **Export options**, edit "Filename template". A live preview shows the
   resulting filename as you type.
3. Use these placeholders (case-insensitive) to include the current date and
   time:

   | Placeholder | Value    |
   | ----------- | -------- |
   | `%yyyy`     | Year (4) |
   | `%yy`       | Year (2) |
   | `%mm`       | Month    |
   | `%dd`       | Day      |
   | `%hh`       | Hour     |
   | `%min`      | Minute   |
   | `%sec`      | Second   |

   For example, `%yyyy%mm%dd myPc` produces `20260930 myPc.html` (and the
   matching extension for the other formats).

The template applies everywhere a filename is generated: basic export from the
popup, the Export page, and Auto-export. Characters not allowed in filenames
(`/ \ : * ? " < > |`) are replaced with `_`, and a template that ends up empty
falls back to "Bookmarks".

## Importing bookmarks

1. Quick import, from the popup:
   - Optionally change the default import mode (see **Settings** below) — it
     starts on **Restore — merge**.
   - Click "Choose file…" and select a bookmarks file (see **Import sources**
     below).
   - The extension automatically detects the format and imports the bookmarks
     immediately using the default import mode. A CSV file — or any other file
     with no Bookmarks Bar/Other Bookmarks data — always imports into a new
     "Imported Bookmarks" folder instead, regardless of the default mode.
   - If the default mode is **Restore — replace**, you're warned and asked to
     confirm before the import runs, since it deletes your current bookmarks (a
     Safety snapshot is saved first, so you can undo it); canceling imports
     nothing.
2. Preview first, from the app's **Import** page:
   - Drop or select a bookmarks file — a preview shows the bookmark counts
     detected in the file before you import anything.
   - Choose an import mode (pre-selected from your default):
     - **Create folder**: adds every bookmark to a new "Imported Bookmarks"
       folder. Available for any file, including CSV (which has no folder
       structure to restore).
     - **Restore — merge**: places bookmarks in their original locations
       alongside your existing ones. Only available for JSON/HTML files that
       carry location data.
     - **Restore — replace**: clears your current Bookmarks Bar and Other
       Bookmarks first, then restores bookmarks to their original locations.
       Only available for files that carry location data.
   - Selecting "Restore — replace" shows how many bookmarks the replace will
     remove and add, and requires confirming a warning dialog before the import
     runs.
   - **Skip duplicates** (on by default) leaves out any bookmark whose URL
     already exists in your browser, and tells you how many it will skip. It
     applies to Create folder and Restore — merge, not to Restore — replace. The
     switch is shared with Quick import.

### Import sources

Snug detects the format from the file's MIME type, then its extension, then its
content. It reads:

- Snug and browser exports: HTML (Netscape bookmarks file), JSON, CSV, and XBEL.
- A Chrome profile `Bookmarks` file (the raw JSON file inside a Chrome profile
  folder). Its folders land in their original locations.
- A Safari export (HTML). Favorites becomes the Bookmarks Bar; Reading List and
  the other Safari folders stay in Other Bookmarks, with Reading List in its own
  folder.

### The Safety snapshot and Undo

Before every Restore — replace, Snug saves a **Safety snapshot** of your
Bookmarks Bar and Other Bookmarks: a JSON file in your Downloads folder, plus
one copy kept inside the extension. If the snapshot can't be saved, nothing is
deleted.

- After a replace, **Undo import** on the result restores the snapshot.
- In **Settings**, **Restore snapshot** restores the latest snapshot at any
  time, after confirming.

Only the latest snapshot is kept, so a newer replace overwrites the older one.
Restoring a snapshot is itself a replace, so Snug saves a new snapshot of your
current bookmarks first.

## Finding duplicates

The **Duplicates** page scans your bookmarks for **Duplicates**: bookmarks whose
URLs match once normalized. The scheme and host are lowercased, `http` and
`https` count as the same, and a leading `www.`, a trailing slash and any
`#fragment` are ignored. Folders are never duplicates.

1. Open **Duplicates**. Each group shows its copies, oldest first.
2. By default Snug keeps the oldest copy and marks the rest **Delete**. Choose
   **Keep** on a different copy to change which one stays.
3. Click the delete button and confirm. Only the copies marked Delete are
   removed; this cannot be undone, and no Safety snapshot is taken.

**Scan again** refreshes the list. If nothing matches, the page says there are
no duplicates.

## Settings

The app's **Settings** page holds the theme (System, Light, Dark), bookmark-tree
display preferences, the default import mode used by Quick import and
pre-selected on the Import page, and the Safety snapshot card (see above).

## Auto-export

Snug can export your bookmarks on a schedule, without any manual action:

1. Open the app's **Auto-export** page.
2. Enable automatic export, choose one or more of the six formats, an interval,
   and an optional folder path for the exported files. Intervals are hourly,
   every 12 hours, daily, every 3 days, or weekly. Daily, every-3-days and
   weekly runs happen at a preferred time; weekly runs also let you pick the
   day. Hourly and 12-hour runs ignore the time.
3. From then on, the extension exports your bookmarks on that schedule and saves
   the files straight to your Downloads folder — no save dialog, no extra
   prompts. If the browser was closed or the extension was unavailable when a
   scheduled export was due, it catches up automatically shortly after the
   browser next starts, instead of waiting for the next scheduled time.

**Keep the last N files** (Retention, default 10) limits how many exported files
pile up: after each successful run, Snug deletes its own oldest exported files
beyond N and their entries in the browser's download history. It only ever
removes files Snug itself saved, never other files in the folder, and a file you
already deleted or moved is simply skipped. A failed run deletes nothing. Set it
to 0 to keep everything.

**Notify me when an export fails** (on by default) shows a system notification,
titled "Auto-export failed" with the reason, when a run fails. Clicking it opens
the Auto-export page. Successful runs never notify, and repeated failures
replace the previous notification instead of stacking. A failed scheduled or
catch-up run also puts a "!" badge on the toolbar icon until a run succeeds.

Changes on the **Auto-export** page are saved automatically. Its status card
always shows the real schedule state, independently of any unsaved changes below
it:

- **Last run** — when auto-export last ran, with its outcome and, on failure,
  the stored error message. The popup also shows the next run, or a failure
  notice, on its auto-export status row.
- **Next run** — when it's next due, or "Auto-export is off" if automatic export
  is currently disabled.

**Export now** runs an export immediately using whatever formats and path are
currently on screen, even if the Enable switch is off. It shows a spinner while
running and a brief success or error message once it settles; the status card's
"Last run" row updates to match. Running it never changes your automatic
schedule or its next due time.
