# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-10-02

- The extension is now called **Snug**, with a new name and icon. Same
  local-only promise: nothing about your data or settings changes.
- Added a new App with a sidebar for export, import, auto-export, settings and
  what's new.
- Redesigned the popup to be more compact.
- Applied the new Snug color palette across the extension.

## [1.7.0] - 2026-10-01

- Added a status card and an Export now button to Auto-export settings, plus a
  popup status line showing whether auto-export is on, off, or failed.
- Hardened bookmark imports to reject disallowed URL schemes (e.g.
  `javascript:`) in CSV, HTML, and JSON files.

## [1.6.0] - 2026-04-29

- Added Auto Export — automatically save your bookmarks at custom intervals
  (every 12 hours, daily, every 3 or 7 days) to your preferred download folder.

## [1.5.0] - 2025-04-29

- Added Advanced Import — restore bookmarks to their original locations
  (Bookmarks Bar and Other Bookmarks), with merge or replace options.

## [1.4.0] - 2025-04-29

- Added customizable filename templates for exports — use date/time placeholders
  like %yyyy, %mm, %dd to create unique, timestamped filenames automatically.

## [1.3.0] - 2025-02-16

- Added dark mode support that automatically matches your system theme
  preferences.

## [1.2.0] - 2025-02-14

- Now automatically adapts to your browser's language! Available in English and
  Spanish.

## [1.1.0] - 2025-02-13

- Imported bookmarks now go to their own folder to avoid mixing with your
  existing bookmarks.
- More precise control over which dates to include in your exports.

## [1.0.0] - 2024-08-05

- Added new Advanced Export feature for more control over your bookmarks.
- Introduced welcome and update pages to keep you informed about new features.
- Improved overall performance for a smoother experience.

## [0.1.1] - 2024-08-04

- Fixed a critical bug that affected users with non-English browser languages.
- Improved reliability for both import and export functions.
- Fixed an issue where the extension icon was not showing in the browser
  toolbar.
- Fixed an issue where the extension was not working in some browsers.

## [0.1.0] - 2024-08-03

- Initial release of Bookmark Import/Export extension.
- Simple import feature for HTML and JSON files.
- Basic functionality for exporting bookmarks to HTML and JSON formats.
