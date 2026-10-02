# 8. Safety snapshot lives in extension storage and in a download

## Status

Accepted

## Context

Restore-replace clears the bookmarks bar and other-bookmarks roots before adding
the imported ones, and a failure halfway used to leave the user with neither
set. We want every replace to be undoable. An extension cannot read back a file
it saved to the downloads folder, so a file alone protects the data but cannot
power an Undo button. That also makes this the first time Snug stores bookmark
content, not only settings.

## Decision

Before every Restore-replace, Snug captures the two roots and saves the capture
twice: as a JSON file in the user's downloads (it survives uninstalling), and as
one snapshot in `chrome.storage.local` under the `unlimitedStorage` permission
(it powers Undo and the Settings restore). Only the latest snapshot is kept; the
next replace overwrites it. Restoring a snapshot is itself a replace.

### Considered options

- **File only** — no extra permission, but no Undo.
- **Storage only** — Undo works, but nothing survives an uninstall or a profile
  reset.
- **IndexedDB** — no gain over `storage.local` here and a second storage layer
  to document.

## Consequences

- New permission `unlimitedStorage` (no install warning), justified in the store
  listing.
- The privacy policy and the store storage justification must say bookmark
  content is stored locally in the snapshot; it never leaves the device.
- A very large library can make the snapshot big, which is why the quota is
  lifted.
