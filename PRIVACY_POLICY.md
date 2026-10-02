# Privacy Policy for Snug

Last updated: April 29, 2026

## Introduction

Snug is committed to protecting your privacy. This Privacy Policy explains our
practices regarding the collection, use, and disclosure of information that we
receive through our Chrome extension.

## Information Collection and Use

Snug does not collect, store, or transmit any personal information about its
users. Our extension operates entirely within your browser and does not send any
data to external servers.

### Bookmarks Data

- The extension accesses your browser bookmarks solely for the purpose of
  exporting them to HTML, JSON, or CSV files, or importing bookmarks from these
  file formats.
- This access occurs only when you explicitly initiate an import or export
  operation, or when a scheduled automatic export you configured runs (see
  "Automatic Export" below).
- Your bookmark data is processed locally on your device and is not transmitted
  to us or any third parties.

### Favicons

- To display site icons next to your bookmarks, the extension reads favicons
  through Chrome's built-in `_favicon` API. This looks up favicons already
  cached by your browser and does not make any network request to us or to the
  bookmarked sites.

### Automatic Export

- You can optionally enable scheduled automatic export of your bookmarks. When
  enabled, the extension exports your bookmarks on the interval you configure
  and writes the resulting files directly to your device's Downloads folder
  using the browser's download functionality, without showing a save-location
  prompt.
- This only happens if you explicitly enable automatic export and configure a
  schedule; it is disabled by default.

## Data Storage

- Snug does not store any user data, including bookmarks, on external servers.
- Any files created during export (manual or automatic) are saved directly to
  your local device through your browser's download functionality.
- The extension stores your local preferences and settings — such as theme,
  display options, export options, the filename template, and your automatic
  export configuration — using the browser's local storage (`storage.local`).
  This data stays on your device and is never transmitted anywhere.

## Permissions

Snug requests the following browser permissions, each used solely for the
purpose described:

| Permission  | Purpose                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `bookmarks` | Read and write your browser bookmarks to support import and export.         |
| `favicon`   | Display site icons next to bookmarks via Chrome's built-in `_favicon` API.  |
| `storage`   | Save your local preferences and settings on your device.                    |
| `tabs`      | Open the extension's app page (Export, Import, settings) in a new tab.      |
| `alarms`    | Schedule and trigger automatic bookmark exports at the configured interval. |
| `downloads` | Save exported bookmark files (manual and automatic) to your device.         |

## Third-Party Services

Our extension does not integrate with or utilize any third-party services or
analytics tools.

## Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any
changes by posting the new Privacy Policy on this page and updating the "Last
updated" date at the top of this policy.

## Contact Us

If you have any questions about this Privacy Policy, please contact us:

- By email: hello@andryore.dev
- By opening an issue on our GitHub repository:
  https://github.com/AndryOre/snug/issues

## Consent

By using Snug, you hereby consent to our Privacy Policy and agree to its terms.
