# 7. Legacy page redirects are the only extra entrypoints

## Status

Accepted. Amends [ADR 0006](0006-single-app-hash-routed-shell.md).

## Context

Before v2 the extension shipped four full-tab pages: `advanced-export.html`,
`advanced-import.html`, `welcome.html` and `update.html`. Users bookmarked or
pinned them, and v1.7.0 even deep-linked to `?settings=auto-export`. ADR 0006
removed them in favor of one hash-routed App, so those URLs now return a "file
not found" page from inside the extension.

## Decision

Keep four minimal entrypoints with those exact names. Each one only redirects to
its App route (`#/export`, `#/import`, `#/welcome`, `#/whats-new`, with
`?settings=auto-export` mapping to `#/auto-export`) and renders nothing else.
They are the single exception to ADR 0006's "a screen is a route, not an
entrypoint" rule, exist only for backward compatibility, and must not grow logic
or UI. No further legacy entrypoints are added.

## Consequences

- Four tiny extra HTML files in the build, no new dependencies.
- Redirect targets go through `getAppUrl` like every other deep link.
- They can be deleted in a future major version once the old URLs stop being
  used.
