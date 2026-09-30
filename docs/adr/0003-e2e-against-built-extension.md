# 3. E2E against the built extension

## Status

Accepted

## Context

`lib/**` unit tests run against `fakeBrowser`, an in-memory implementation of
the WebExtension APIs (see
[`docs/development.md#fakebrowser-testing`](../development.md#fakebrowser-testing)).
That layer never exercises the real MV3 wiring — the manifest, permissions,
`_locales` i18n loading, and the service worker's actual lifecycle events
(`runtime.onInstalled`, `runtime.onStartup`, `alarms.onAlarm`) — because
`fakeBrowser` reimplements those APIs rather than running inside an actual
browser. `@webext-core/fake-browser` (which `fakeBrowser` wraps) doesn't even
implement `browser.bookmarks.*`; this repo already patches that in via
`lib/testing/fake-bookmarks.ts`, which is a further step removed from the
extension a user actually installs. This repo also has no existing
component-test layer (no Storybook, no isolated page-component harness), so
there was no partial middle ground to reuse.

## Decision

- **E2E runs Playwright against the built extension.** `bun run test:e2e` runs
  `wxt build` (producing `.output/chrome-mv3`) and then `playwright test`, so
  every spec loads the same artifact `wxt zip` would ship, not a dev-server
  build or a mock.
- **Headless Chromium via `launchPersistentContext`.** Chrome extensions only
  load through a persistent context
  (`chromium.launchPersistentContext(userDataDir, { channel: 'chromium', args: ['--load-extension=...', '--disable-extensions-except=...'] })`)
  — there is no way to load an unpacked extension into a plain
  `browser.newContext()`. `channel: 'chromium'` pins Playwright's bundled
  Chromium build (not the system Chrome), which is the only channel this MV3
  extension is written and tested against. Every test gets a fresh `mkdtemp`-ed
  profile directory, removed on teardown, so no test can see another test's
  browser state.
- **Bookmarks are seeded and asserted through the extension's own service
  worker**, via `serviceWorker.evaluate(() => chrome.bookmarks...)` in
  `e2e/fixtures.ts`, not through `fakeBrowser`. This routes every write and read
  through the exact same `chrome.bookmarks` implementation the shipped extension
  calls, so a spec's assertions can't diverge from what a real user would see.
- **`e2e/fixtures.ts` is the one shared harness** every E2E ticket in this suite
  (this one's smoke spec, plus popup export, Advanced Import, and Advanced
  Export) extends, exposing the persistent context, `extensionId`,
  `serviceWorker`, an `openExtensionPage(name)` helper, and the
  seed/read-bookmarks helpers — so each spec differs only in what it does with
  the extension, not in how it's loaded.

### Rejected alternatives

- **A component-test layer** (rendering `App.tsx` trees in isolation, e.g. via
  Storybook or a bare React Testing Library harness) — rejected as the sole test
  layer because it can't exercise the manifest, permissions, i18n loading, or
  the service worker; it would only ever prove the React components render,
  which `lib/**` unit tests plus a real E2E pass already cover more usefully.
  Adding it as an _additional_ layer on top of E2E was also rejected: for a
  single-maintainer extension this size, the marginal coverage doesn't justify a
  second test framework and its own conventions.
- **Driving the extension through `fakeBrowser`** for E2E-style specs instead of
  Playwright — rejected for the same reason unit tests already use it for
  `lib/**` only: it can't validate the real MV3 wiring, which is exactly what
  E2E exists to cover.
- **A non-persistent `browser.newContext()`** — not viable at all; Chromium only
  loads unpacked extensions through `launchPersistentContext`.
- **`channel: 'chrome'`** (the system-installed Chrome instead of Playwright's
  bundled Chromium) — rejected: it would require Chrome to be installed on every
  machine and CI runner that runs this suite, for no behavioral difference
  relevant to this extension's MV3 APIs.

## Consequences

- `bun run test:e2e` always builds first (`wxt build && playwright test`), so a
  spec never runs against stale output from a previous manual build.
- E2E specs are slower than unit tests (real browser startup per test) and run
  as their own CI job (`e2e` in `.github/workflows/ci.yml`) rather than folded
  into the `quality` job, so a slow or flaky E2E run doesn't block the fast
  format/lint/typecheck/knip/unit-test feedback loop from reporting first.
- `bunx playwright install --with-deps chromium` (with its OS-package install)
  is CI-only; local runs use plain `bunx playwright install chromium` — this
  machine class (headless Ubuntu, no sudo for unattended commands) can't run
  `--with-deps` locally, and shouldn't need to, since the browser binary alone
  is sufficient outside a fresh CI container.
- Every future E2E ticket extends `e2e/fixtures.ts` rather than reimplementing
  `launchPersistentContext` setup, keeping the "how is the extension loaded"
  decision in one place.
