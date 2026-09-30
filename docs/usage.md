# Usage

## Exporting bookmarks

1. Click on the extension icon in your browser toolbar to open the popup.
2. Choose the "Export" tab.
3. For basic exporting:
   - Select either HTML, JSON or CSV format.
   - Click the corresponding button to export your bookmarks.
   - Choose a location on your device to save the exported file.
4. For advanced exporting:
   - Click the "Advanced Export" button.
   - Use the search bar to find specific bookmarks.
   - Select individual bookmarks or folders.
   - Customize export settings (include dates, hide specific folders, etc.).
   - Choose the export format and click the export button.

## Naming exported files

By default, exported files are named "Bookmarks". To customize this:

1. Open "Advanced Export" and click the settings (gear) icon.
2. Go to the "Export" tab and edit "Filename template". A live preview shows the
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
popup, Advanced Export, and automatic backups. Characters not allowed in
filenames (`/ \ : * ? " < > |`) are replaced with `_`, and a template that ends
up empty falls back to "Bookmarks".

## Importing bookmarks

1. Choose the "Import" tab.
2. For basic importing:
   - Optionally change the "Default import mode" select above the Import button
     — it starts on **Restore — merge** and is shared with Advanced Import's
     mode choice below.
   - Click the "Import" button.
   - Select a CSV, JSON or HTML file containing bookmarks.
   - The extension automatically detects the format and imports the bookmarks
     using the default import mode. A CSV file — or an HTML/JSON file with no
     Bookmarks Bar/Other Bookmarks data — always imports into a new "Imported
     Bookmarks" folder instead, regardless of the default mode.
   - If the default mode is **Restore — replace**, you're asked to confirm
     before the import runs, since it permanently deletes your current
     bookmarks; canceling imports nothing.
3. For advanced importing:
   - Click the "Advanced Import" button.
   - Drop or select a CSV, JSON or HTML file — a preview shows the bookmark
     counts detected in the file before you import anything.
   - Choose an import mode:
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

## Automatic backups

Bookmark Import/Export can back up your bookmarks on a schedule, without any
manual action:

1. Open the extension's advanced export settings and go to the "Auto-export"
   tab.
2. Enable automatic export, choose one or more formats (HTML, JSON, CSV), an
   interval (every 12 hours, or daily/every 3 days/every 7 days at a preferred
   time), and an optional folder path for the exported files.
3. From then on, the extension exports your bookmarks on that schedule and saves
   the files straight to your Downloads folder — no save dialog, no extra
   prompts. If the browser was closed or the extension was unavailable when a
   scheduled export was due, it catches up automatically shortly after the
   browser next starts, instead of waiting for the next scheduled time.

The "Auto-export" tab's status card, at the top, always shows the real schedule
state, independently of any unsaved changes below it:

- **Last auto-export** — when auto-export last ran, with a colored dot (green
  for success, red for failure) and, on failure, the stored error message. Reads
  "Never run yet" if it hasn't run since the extension was installed.
- **Next auto-export** — when it's next due, or "Off" if automatic export is
  currently disabled.

**Export now**, next to "Save settings", runs an export immediately using
whatever formats and path are currently on screen — even formats/path you
haven't saved yet, and even if the Enable switch is off. It shows a spinner
while running and a brief success or error message once it settles; the status
card's "Last auto-export" row updates to match. Running it never changes your
automatic schedule or its next due time.
