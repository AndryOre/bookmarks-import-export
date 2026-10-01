# 5. Store publishing via CWS API v2 from the release workflow

## Status

Accepted

## Context

`release.yml` builds the extension zip, attests build provenance, and publishes
a GitHub Release, but it never uploads to the Chrome Web Store. As a result the
public listing drifted to v1.3.0 while the repository has moved on to v1.7.0:
every release since has shipped to GitHub but never reached users through the
store's update channel.

The Chrome Web Store API has two generations. v1.1's `Item` resource (`kind`,
`id`, `publicKey`, `uploadState`, `itemError`) only ever supported upload and
publish; it sunsets entirely on 2026-10-15. v2
(`chromewebstore.googleapis.com/v2/publishers/{pub}/items/{id}`) replaces it
with `media.upload`, `publish`, `fetchStatus`, `cancelSubmission`, and
`setPublishedDeployPercentage` — the same scope as v1.1, package lifecycle only.
Neither version, in any generation, exposes listing text, screenshots, promo
graphics, privacy-practice fields, or distribution settings; Google's own v2
announcement states that metadata still has to be set in the Developer
Dashboard. So no API choice here can make listing edits scriptable — that stays
a manual, dashboard-driven task regardless.

Authenticating to either API version needs either an OAuth client with a refresh
token (tied to a human Google account, and the token can expire or be revoked
when that account's security state changes) or a service account (added once in
Dashboard → Account, authenticates with a JSON key or short-lived token, scoped
to nothing but the Chrome Web Store API).

## Decision

- `release.yml` runs `wxt submit` (the `publish-browser-extension` package WXT
  already depends on) as a step after the GitHub Release is published, pointed
  at the same `.output/*-chrome.zip` the release step already built.
- Authentication is a **service account**, not an OAuth refresh token:
  `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` and
  `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`, alongside `CHROME_PUBLISHER_ID` and
  `CHROME_EXTENSION_ID`. `CHROME_API_VERSION` is pinned to `v2` explicitly — the
  package falls back to the soon-dead v1.1 if this is left unset.
- These secrets live in a dedicated GitHub Environment (`chrome-web-store`), not
  repository-level secrets, so the publishing step can be gated independently of
  the rest of the workflow's permissions.
- A guard step checks every required secret is non-empty before invoking
  `wxt submit`, and fails the job with an explicit message naming what's
  missing, rather than letting the CLI fail further in with a less legible
  error.
- **Out of scope by construction:** listing text, screenshots, promo tiles, and
  privacy-practice fields. Those remain dashboard-managed; no API exists for
  them in either version. Rollout-percentage control
  (`setPublishedDeployPercentage`) is also unused for now — it requires 10,000+
  weekly active users, which this extension doesn't have.

## Consequences

- A signed `v*` tag now drives both the GitHub Release and the Chrome Web Store
  submission from one workflow run — the store can no longer silently fall
  behind GitHub releases the way it did for four versions.
- Revoking store-publishing access from CI is a one-step action in the Developer
  Dashboard (remove the service account), independent of any human account's
  credentials or 2-Step Verification state.
- The v1.1 sunset deadline (2026-10-15) no longer matters to this repo's release
  process, since it never depends on v1.1 behavior.
- Editing the store listing itself (text, graphics, privacy answers) still
  requires a human in the Developer Dashboard, or a browser-automation session
  against a logged-in profile — tracked separately, outside this workflow.

### Rejected alternatives

- **v1.1 API**: sunsets 2026-10-15, two weeks from this decision; adopting it
  now would mean migrating again almost immediately.
- **OAuth refresh token**: ties CI to a human Google account's session state and
  2-Step Verification; a service account has neither failure mode and is
  purpose-scoped.
- **Community dashboard-automation MCPs** (e.g. `cws-mcp`'s Playwright-driven
  metadata editing): unofficial, keyed to current DOM label text, and cover only
  a subset of dashboard fields in one language. Not suitable for an unattended
  CI step; at most a human-supervised tool for the listing-editing work this ADR
  explicitly excludes.
