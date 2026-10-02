# Usage

## Opening the app

Click the extension icon to open the popup, then "Open app" for the full-page
app (also reachable from the browser's extension options). A sidebar switches
between **Export**, **Import**, **Auto-export**, **Settings**, **What's new**
and **Welcome**.

## Exporting bookmarks

1. Quick export: in the popup, pick HTML, JSON or CSV and click "Export all" to
   export your whole bookmark tree.
2. For control over what is exported, open the app's **Export** page:
   - Use the search box to find specific bookmarks.
   - Check individual bookmarks or whole folders (or use "Select all").
   - Adjust the **Export options** panel (favicons, dates, hiding folders,
     filename template).
   - Choose the export format and click "Export N bookmarks".

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

   For example, `%yyyy%mm%dd myPc` produces `20260930 myPc.html` (and `.json` /
   `.csv` for those formats).

The template applies everywhere a filename is generated: basic export from the
popup, the Export page, and automatic backups. Characters not allowed in
filenames (`/ \ : * ? " < > |`) are replaced with `_`, and a template that ends
up empty falls back to "Bookmarks".

## Importing bookmarks

1. Quick import, from the popup:
   - Optionally change the default import mode (see **Settings** below) — it
     starts on **Restore — merge**.
   - Click "Choose file…" and select a CSV, JSON or HTML file containing
     bookmarks.
   - The extension automatically detects the format and imports the bookmarks
     immediately using the default import mode. A CSV file — or an HTML/JSON
     file with no Bookmarks Bar/Other Bookmarks data — always imports into a new
     "Imported Bookmarks" folder instead, regardless of the default mode.
   - If the default mode is **Restore — replace**, you're warned and asked to
     confirm before the import runs, since it permanently deletes your current
     bookmarks; canceling imports nothing.
2. Preview first, from the app's **Import** page:
   - Drop or select a CSV, JSON or HTML file — a preview shows the bookmark
     counts detected in the file before you import anything.
   - Choose an import mode (pre-selected from your default):
     - **Create folder**: adds every bookmark to a new "Imported Bookmarks"
       folder. Available for any file, including CSV (which has no folder
       structure to restore).
     - **Restore — merge**: places bookmarks in their original locations
       alongside your existing ones. Only available for JSON/HTML files that
       carry location data.
     - **Restore — replace**: clears your current Bookmarks Bar and Other
       Bookmarks first, then restores bookmarks to their original locations.
       Only available for JSON/HTML files that carry location data.
   - Selecting "Restore — replace" requires confirming a warning dialog before
     the import runs, since it permanently deletes your current bookmarks.

## Settings

The app's **Settings** page holds the theme (System, Light, Dark), bookmark-tree
display preferences, and the default import mode used by Quick import and
pre-selected on the Import page.

## Automatic backups

Snug can back up your bookmarks on a schedule, without any manual action:

1. Open the app's **Auto-export** page.
2. Enable automatic export, choose one or more formats (HTML, JSON, CSV), an
   interval (every 12 hours, or daily/every 3 days/every 7 days at a preferred
   time), and an optional folder path for the exported files.
3. From then on, the extension exports your bookmarks on that schedule and saves
   the files straight to your Downloads folder — no save dialog, no extra
   prompts. If the browser was closed or the extension was unavailable when a
   scheduled export was due, it catches up automatically shortly after the
   browser next starts, instead of waiting for the next scheduled time.

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
