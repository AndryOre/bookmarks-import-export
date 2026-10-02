# 6. Single hash-routed App shell

## Status

Accepted

## Context

The UI was four separate full-tab entrypoints (advanced export, advanced import,
update, welcome) plus the popup, each its own React tree with its own header and
navigation. Redesigning around one App with a sidebar needs client-side routing
inside a single extension page, where only hash history works (an extension page
has no server to answer deep paths) and deep links from the popup and background
must target a specific screen.

## Decision

The App is one entrypoint, `app.html`, routed with TanStack Router on hash
history (`app.html#/export`, `#/import`, ...). Route paths and URL building live
in `lib/app-url.ts`. The shell, not each page, owns the hash-history behavior
described below.

### Considered options

- **Hand-rolled hash hook** — no dependency, but we would rebuild typed routes,
  search params, redirects and navigation blocking ourselves.
- **wouter** — tiny and hash-capable, but with no typed route tree or
  search-param validation, which the Export page's `q` param benefits from.
- **React Router v7** — capable, but heavier, and its data-router features are
  unused here.
- **nuqs** — typed URL state, not a router; it solves only the search-param
  slice.

## Consequences

- About 40 KB gzipped of router code, loaded only by the app page; the popup and
  background are unaffected.
- Hash history has quirks the shell handles: it has no automatic scroll-to-top,
  so the shell registers its scroll container (`[data-app-scroll]`) for it;
  `target="_blank"` links must not use router `Link` (they open the raw hash URL
  in a new tab); and the manifest options page opens `app.html` with no hash, so
  the index route redirects to `/export`.
- Every deep link must go through `getAppUrl`; hard-coded `app.html#/...`
  strings are a smell.
- Adding a screen means adding a route module and a nav entry, not an
  entrypoint. The only exception is the four legacy redirect pages in
  [ADR 0007](0007-legacy-page-redirects.md).
