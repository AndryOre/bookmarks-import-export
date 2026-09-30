# Roadmap

This document describes the project's direction at a high level. It is reviewed
yearly; day-to-day planning happens in [Linear](https://linear.app/) and
[GitHub issues](https://github.com/AndryOre/bookmarks-import-export/issues),
which are the source of truth for what's actually being worked on next.

## Next 12 months

The focus for the next year is maintenance rather than new surface area:

- **Maintenance** — keeping dependencies, CI, and the extension's platform
  compatibility current as Chrome and the broader extension ecosystem evolve.
- **Meaning improvements** — refining existing features (export, import,
  scheduled backups) based on real usage and feedback, without expanding into
  new domains.
- **Bug fixes** — addressing defects as they're reported.
- **Issue triage** — keeping the issue tracker current so contributors and users
  know what's open, planned, or declined.

## Future enhancements under consideration

The following are ideas that have come up but are not yet scoped, scheduled, or
committed to. Being listed here is not a promise they will ship:

- Additional bookmark formats or import sources.
- Finer-grained scheduling or filtering for automatic backups.
- Accessibility and localization improvements beyond current coverage.

## Out of scope

The following are explicitly not planned, in keeping with the project's privacy
posture (see the [Privacy Policy](PRIVACY_POLICY.md)):

- **Backend services** — the extension has no server component today and none is
  planned.
- **Cloud sync** — bookmarks are exported to local files only; no third-party or
  first-party cloud storage integration is planned.
- **Telemetry** — the extension makes no network calls and collects no usage
  data; that will not change.

## Where planning actually happens

This roadmap is intentionally coarse. Concrete, scheduled work lives in Linear
and in
[GitHub issues](https://github.com/AndryOre/bookmarks-import-export/issues) —
those are the places to check for what's happening next, and the places to
propose new work. This document itself is reviewed yearly to keep it aligned
with reality.
