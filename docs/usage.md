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

1. Open the extension's advanced export settings and enable automatic export.
2. Choose one or more formats (HTML, JSON, CSV), an interval (every 12 hours, or
   daily/every 3 days/every 7 days at a preferred time), and an optional folder
   path for the exported files.
3. From then on, the extension exports your bookmarks on that schedule and saves
   the files straight to your Downloads folder — no save dialog, no extra
   prompts.
