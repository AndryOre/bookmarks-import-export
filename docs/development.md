# Development

## Scripts

| Script                  | What it does                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `bun run dev`           | Starts the WXT dev server (Chrome MV3).                                                                    |
| `bun run build`         | Produces a production build (Chrome MV3).                                                                  |
| `bun run zip`           | Builds and packages the extension into a distributable `.zip`.                                             |
| `bun run check`         | Aggregate gate: `format:check` → `lint` → `typecheck` → `knip`. Run before opening a PR.                   |
| `bun run fix`           | Aggregate autofix: `format:write` → `lint:fix` → `typecheck`.                                              |
| `bun run knip`          | Finds unused files, exports, and dependencies (`bunx knip`).                                               |
| `bun run ci:local`      | Reproduces CI locally: frozen-lockfile install → `check` → `lint:docs` → `test`.                           |
| `bun run clean`         | Removes build output and `node_modules`.                                                                   |
| `bun run cache:clear`   | Clears ESLint and `node_modules/.cache` caches.                                                            |
| `bun run format:check`  | Checks formatting with Prettier (no writes).                                                               |
| `bun run format:write`  | Formats the repo with Prettier.                                                                            |
| `bun run lint`          | Runs ESLint (`--max-warnings=0`, cached).                                                                  |
| `bun run lint:docs`     | Local `lychee` link check, matching `lint-docs.yml`'s markdown link gate.                                  |
| `bun run lint:fix`      | Runs ESLint with `--fix` (`--max-warnings=0`, cached).                                                     |
| `bun run typecheck`     | Runs `tsc --noEmit`.                                                                                       |
| `bun run test`          | Runs the Vitest suite once.                                                                                |
| `bun run test:coverage` | Runs the Vitest suite with coverage (`lib/**`, v8 provider, 80% lines/statements/functions, 50% branches). |
| `bun run test:watch`    | Runs Vitest in watch mode.                                                                                 |
| `bun run test:e2e`      | Builds the extension (`wxt build`), then runs the Playwright E2E suite (`e2e/**`).                         |

## Git hooks

Hooks are installed via Husky and live in `.husky/`:

- **`pre-commit`** — runs `bunx lint-staged`, which applies Prettier + ESLint to
  staged `*.{js,jsx,ts,tsx,mjs}` files and Prettier alone to staged
  `*.{json,md,mdx,css,scss,yml,yaml}` files (see `lint-staged.config.mjs`).
- **`commit-msg`** — runs `bunx commitlint --edit $1` against
  `commitlint.config.mjs`, which only extends `@commitlint/config-conventional`.
  It enforces the Conventional Commits `<type>: <subject>` shape and the type
  list below, but it does **not** enforce the gitmoji — a commit without an
  emoji still passes this hook. The gitmoji is a repository convention, not a
  lint-enforced rule.
- **`pre-push`** — rejects a push if the current branch name doesn't match
  `^(main|renovate/.+|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)/[a-z0-9._-]+)$`.

## CI

Every PR — including docs-only changes — runs the full `ci.yml` pipeline:
`quality`, `build`, `e2e`, and `commitlint`. The `CI passed` job aggregates
their results and is the single status check required to merge; it passes once
every needed job is `success` or `skipped` (e.g. `commitlint` is skipped on
`push` runs), and fails if any needed job is `failure` or `cancelled`.

## Commit format

`<type>: <emoji> <lowercase subject>`, e.g. `feat: ✨ add dark mode`.

`<type>` must be one of the types `@commitlint/config-conventional` allows,
matching CI's `lint-pr.yml`:

```
feat fix docs style refactor perf test build ci chore revert
```

The subject must start with a lowercase letter.

## Branch naming

Branch names must match:

```
^(main|renovate/.+|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)/[a-z0-9._-]+)$
```

e.g. `feat/csv-export`, `fix/popup-crash`, `chore/bump-deps`.

## Adding a `@shadcn/lint` contract

`eslint.config.mjs` defines `shadcnNoRestyleContracts` — a list of per-component
exceptions to the `shadcn/no-restyle` rule. Each entry pairs a component name
`pattern` (regex) with an `allow` list of class categories/literal classes that
component is permitted to add on top of its shadcn/ui defaults.

To add a new contract:

1. Add an entry to `shadcnNoRestyleContracts` in `eslint.config.mjs`:
   ```js
   {
     pattern: '^ComponentName$',
     allow: ['layout', 'text-sm'],
   }
   ```
2. Write a one-line comment above the entry explaining the real, bounded design
   decision it encodes — never add a contract just to silence the rule.
3. Run `bun run lint` to confirm the rule now accepts the component's actual
   usage and nothing broader.

## `fakeBrowser` testing

`lib/**` unit tests run against `wxt/testing/fake-browser`'s `fakeBrowser` — an
in-memory implementation of the WebExtension APIs, wired in via `WxtVitest()` in
`vitest.config.ts`.

`@webext-core/fake-browser` (which `fakeBrowser` wraps) does not implement
`browser.bookmarks.*` — every method throws "not implemented". This repo patches
a minimal in-memory bookmark tree onto `fakeBrowser.bookmarks` via
`lib/testing/fake-bookmarks.ts`, so tests can exercise real
`browser.bookmarks.create/search/getTree/removeTree` calls end to end.
`lib/testing/fake-i18n.ts` provides the same treatment for `browser.i18n`.

`fakeBrowser.reset()` does not touch `bookmarks` (it only resets APIs that
implement `resetState`), so call `resetFakeBookmarks()` (and `resetFakeI18n()`,
if used) alongside it in `beforeEach`.

Coverage is scoped to `lib/**` only (see `vitest.config.ts`), with an 80%
threshold on lines/statements/functions and 50% on branches.

See [CONTRIBUTING's `## Tests`](../CONTRIBUTING.md#tests) section for this
repository's testing policy: what a PR is expected to cover and when.

## E2E testing

`e2e/**` runs Playwright against the extension's real build output
(`.output/chrome-mv3`, produced by `wxt build`), loaded into Playwright's
bundled headless Chromium via `chromium.launchPersistentContext` +
`--load-extension`. See
[`docs/adr/0003-e2e-against-built-extension.md`](adr/0003-e2e-against-built-extension.md)
for why this runs against the built extension instead of a component-test layer.

- `e2e/fixtures.ts` is the shared harness every spec extends: the persistent
  `context`, `extensionId`, the extension's `serviceWorker`, an
  `openExtensionPage(name)` helper (e.g. `openExtensionPage('popup.html')`), and
  `seedBookmarks`/`readBookmarkTree` helpers that drive `chrome.bookmarks.*`
  through `serviceWorker.evaluate` — not `fakeBrowser` — so bookmarks state goes
  through the same implementation a real user's browser would use.
- Every test gets a fresh temporary Chromium profile, removed on teardown, so no
  test can see another test's browser state.
- Run locally with `bun run test:e2e`. It needs Playwright's Chromium binary
  installed once via `bunx playwright install chromium` — never `--with-deps` or
  `sudo` outside CI, which installs OS packages this repo's local dev machines
  shouldn't need.
- `bun run test:e2e` isn't part of `bun run check`; CI runs it as its own `e2e`
  job (`.github/workflows/ci.yml`), which installs browsers with
  `bunx playwright install --with-deps chromium` and uploads the Playwright HTML
  report as an artifact on failure.

## Accessibility

- **Linting**: `eslint-plugin-jsx-a11y`'s `recommended` config is enabled in
  `eslint.config.mjs` and runs as part of `bun run lint` (`--max-warnings=0`, so
  an a11y violation fails the same way any other lint error does). It catches
  issues like missing alt text, non-interactive elements with click handlers but
  no keyboard equivalent, and invalid ARIA attributes.
- **Accessible primitives**: interactive UI is built from `components/ui/**`
  (shadcn/ui components on top of Radix UI primitives), which ship correct ARIA
  roles, keyboard handling, and focus management out of the box. Prefer
  composing these primitives over hand-rolling interactive elements from
  `div`/`span`.
- **Keyboard operability**: every interactive control (buttons, links, form
  fields, dialogs) must be reachable and operable via keyboard alone — no
  handler that only responds to `onClick`/`onMouseOver` without a keyboard
  equivalent.
- **Labels**: every form control needs an accessible name — a visible `<label>`,
  an `aria-label`, or `aria-labelledby`. Icon-only buttons need an `aria-label`
  describing the action.
- **Focus visibility**: don't suppress the browser's focus ring (no
  `outline: none` without a replacement focus style). shadcn/ui's components
  already include a visible focus-visible style; keep it when customizing a
  component per this repo's
  [`@shadcn/lint` contract](#adding-a-shadcnlint-contract) rules.

## Repository settings

This repo's GitHub settings (rulesets on `main` and `v*` tags, merge strategy,
private vulnerability reporting, SHA-pinned Actions, immutable releases,
workflow execution protections, and feature/metadata flags) are no longer
applied via a script — `scripts/repo-settings/apply.sh` was temporary
settings-as-code tooling and has since been deleted. See
[`docs/adr/0001-public-repo-security-posture.md`](adr/0001-public-repo-security-posture.md)
for the target state this repository's settings were brought to, the reasoning
behind each choice, and why the script was removed rather than kept around
permanently.

## Code documentation

Every code comment in this repository (outside `components/ui/**`, the
shadcn/ui-generated layer) is a `/**` TSDoc block, added only where it earns its
place on a non-obvious export — never restating what a signature already says.
Plain `//` line comments and non-JSDoc `/* */` block comments are disallowed;
the only exceptions are directive comments a tool reads rather than a human:
`eslint*` (`eslint-disable`, `eslint-enable`, ...), `global`, `@ts-*`
(`@ts-expect-error`, ...), `prettier-ignore`, `@vitest-environment`, and
TypeScript triple-slash reference directives.

This is enforced by ESLint: the local `local/no-non-doc-comments` rule bans
non-doc comments, `jsdoc/informative-docs` rejects a TSDoc block that only
repeats its symbol's name back, and
`@eslint-community/eslint-comments/require-description` requires every
`eslint-disable*` comment to say why. See
[`docs/adr/0002-tsdoc-only-code-comments.md`](adr/0002-tsdoc-only-code-comments.md)
for the full rationale.
