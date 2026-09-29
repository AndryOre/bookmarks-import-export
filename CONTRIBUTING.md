# Contributing

Thanks for your interest in contributing to Bookmark Import/Export! This
document covers the conventions this repository expects from a pull request.

By participating in this project, you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

See [`docs/development.md`](docs/development.md) for the full local development
guide: available scripts, git hooks, `fakeBrowser` testing, and how to add a
`@shadcn/lint` contract.

## Branch naming

Branches are validated by the repository's `pre-push` hook (see
[`docs/development.md`](docs/development.md#git-hooks)) and must match:

```
^(main|renovate/.+|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)/[a-z0-9._-]+)$
```

For example: `feat/csv-export`, `fix/popup-crash`, `chore/bump-deps`.

## Commit and PR title format

Commits and pull request titles use gitmoji + Conventional Commits:

```
<type>: <emoji> <lowercase subject>
```

For example: `feat: ✨ add dark mode`.

`<type>` must be one of the types allowed by
[`docs/development.md`](docs/development.md#commit-format), which mirrors the
`Validate PR title` CI check:

```
feat fix docs style refactor perf test build ci chore revert
```

The subject must start with a lowercase letter. The `commit-msg` git hook
enforces this locally for commits, and CI enforces it for the PR title.

## Merging

This repository merges pull requests via **squash merge only**, keeping a linear
history on `main`. Your commits within a PR don't need to follow the format
above individually, but the final PR title does, since it becomes the squashed
commit message.

## CI

The `CI passed` check must be green before a pull request can be merged. This
includes formatting, linting, type-checking, and tests — run `bun run check`
(and `bun run test`) locally before opening a PR to catch issues early.

## Reporting security issues

Do not open a public issue for a security vulnerability. Report it privately as
described in [`.github/SECURITY.md`](.github/SECURITY.md).
