# AGENTS.md

Instructions for coding agents working in this repository.

## Stack

A Chrome MV3 web extension (WXT + `@wxt-dev/module-react`), React 19,
TypeScript, Tailwind CSS v4, and shadcn/ui (`components/ui/**`). No backend, no
network calls — every operation reads and writes the browser's own bookmarks
tree. See [`docs/architecture.md`](docs/architecture.md) for the full code map.

## Running scripts

Always use `bun run <script>` — never call the underlying tool directly, and
never mix in another package manager (this repo uses `bun.lock`). Read
`package.json`'s `scripts` before inventing a command.

- `bun run check` — format:check, lint, typecheck, knip. Run this after any
  change.
- `bun run test` — the Vitest suite. Run this after any change to `lib/**` or
  its consumers.
- `bun run build` — **do not run unless explicitly asked.** It's slow and not
  needed to verify most changes.

## Branch and commit conventions

Branch names and commit/PR titles follow fixed patterns, gitmoji included by
convention (not lint-enforced). Detail:
[`docs/development.md#branch-naming`](docs/development.md#branch-naming),
[`docs/development.md#commit-format`](docs/development.md#commit-format).

## Code comments

Every code comment (outside `components/ui/**`) is a TSDoc block on a
non-obvious export — no `//` or non-JSDoc `/* */` comments, except lint/type
directives. Detail:
[`docs/development.md#code-documentation`](docs/development.md#code-documentation),
[`docs/adr/0002-tsdoc-only-code-comments.md`](docs/adr/0002-tsdoc-only-code-comments.md).

## `components/ui/**` is untouchable

This is the shadcn/ui-generated registry layer. Do not hand-edit it — add or
change components via `shadcn` CLI conventions instead, and keep customizations
in consumer components.

## Escalating a `@shadcn/lint` finding

When `bun run lint` reports a `shadcn/*` finding (e.g. `shadcn/no-restyle`) on a
component you're changing, work up this ladder — never disable the rule
file-wide or project-wide:

1. Use an existing shadcn/ui variant that already covers the styling you need.
2. Add a new variant to the component if no existing one fits.
3. Add or change a `no-restyle` contract in `shadcnNoRestyleContracts`
   (`eslint.config.mjs`), encoding one real, bounded design decision. Detail:
   [`docs/development.md#adding-a-shadcnlint-contract`](docs/development.md#adding-a-shadcnlint-contract).
4. Last resort: a single-line `eslint-disable-next-line -- <reason>` on the
   exact offending line. Never a file-level or project-level disable.
