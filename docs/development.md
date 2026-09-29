# Development

## Scripts

| Script                  | What it does                                                                     |
| ----------------------- | -------------------------------------------------------------------------------- |
| `bun run dev`           | Starts the WXT dev server (Chrome MV3).                                          |
| `bun run build`         | Produces a production build (Chrome MV3).                                        |
| `bun run zip`           | Builds and packages the extension into a distributable `.zip`.                   |
| `bun run check`         | Aggregate gate: `format:check` → `lint` → `typecheck`. Run before opening a PR.  |
| `bun run fix`           | Aggregate autofix: `format:write` → `lint:fix` → `typecheck`.                    |
| `bun run ci:local`      | Reproduces CI locally: frozen-lockfile install → `check` → `lint:docs` → `test`. |
| `bun run clean`         | Removes build output and `node_modules`.                                         |
| `bun run cache:clear`   | Clears ESLint and `node_modules/.cache` caches.                                  |
| `bun run format:check`  | Checks formatting with Prettier (no writes).                                     |
| `bun run format:write`  | Formats the repo with Prettier.                                                  |
| `bun run lint`          | Runs ESLint (`--max-warnings=0`, cached).                                        |
| `bun run lint:docs`     | Local `lychee` link check, matching `lint-docs.yml`'s markdown link gate.        |
| `bun run lint:fix`      | Runs ESLint with `--fix` (`--max-warnings=0`, cached).                           |
| `bun run typecheck`     | Runs `tsc --noEmit`.                                                             |
| `bun run test`          | Runs the Vitest suite once.                                                      |
| `bun run test:coverage` | Runs the Vitest suite with coverage (`lib/**`, v8 provider, 50% thresholds).     |
| `bun run test:watch`    | Runs Vitest in watch mode.                                                       |

## Git hooks

Hooks are installed via Husky and live in `.husky/`:

- **`pre-commit`** — runs `bunx lint-staged`, which applies Prettier + ESLint to
  staged `*.{js,jsx,ts,tsx,mjs}` files and Prettier alone to staged
  `*.{json,md,mdx,css,scss,yml,yaml}` files (see `lint-staged.config.mjs`).
- **`commit-msg`** — runs `bunx commitlint --edit $1` against
  `commitlint.config.mjs` (`@commitlint/config-conventional`), enforcing the
  commit format below.
- **`pre-push`** — rejects a push if the current branch name doesn't match
  `^(main|renovate/.+|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)/[a-z0-9._-]+)$`.

## CI

Every PR — including docs-only changes — runs the full `ci.yml` pipeline:
`quality`, `build`, and `commitlint`. The `CI passed` job aggregates their
results and is the single status check required to merge; it passes once every
needed job is `success` or `skipped` (e.g. `commitlint` is skipped on `push`
runs), and fails if any needed job is `failure` or `cancelled`.

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

Coverage is scoped to `lib/**` only (see `vitest.config.ts`), with a 50%
threshold on lines/statements/branches/functions.

## Repository settings

This repo's GitHub settings (rulesets on `main` and `v*` tags, merge strategy,
private vulnerability reporting, SHA-pinned Actions, immutable releases,
workflow execution protections, and feature/metadata flags) are codified and
applied via `gh api` rather than clicked through the Settings UI. See
`docs/adr/0001-public-repo-security-posture.md` for the full target state and
the reasoning behind each choice.

To (re-)apply them:

```sh
scripts/repo-settings/apply.sh <owner/repo>
```

The script is idempotent — running it again against the same repo leaves the
same end state — and logs a warning (without aborting) for any setting the
GitHub API refuses, e.g. `secret_scanning_non_provider_patterns`, which this
repo's plan does not currently support.

**This script and the `scripts/repo-settings/` folder are temporary.** This
repository is planned to migrate to `AndryOre/bookmarks-import-export`. Once
that migration happens and `apply.sh` has been re-run against the new repo,
delete `scripts/repo-settings/` entirely — it is not meant to be permanent
settings-as-code infrastructure.
