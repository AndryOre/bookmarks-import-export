# Contributing

Thanks for your interest in contributing to Bookmark Import/Export! This
document covers the conventions this repository expects from a pull request.

By participating in this project, you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

See [`docs/development.md`](docs/development.md) for the full local development
guide: available scripts, git hooks, `fakeBrowser` testing, and how to add a
`@shadcn/lint` contract.

## Branch naming and commit format

Branch names and commit/PR titles follow fixed conventions — see
[`docs/development.md`](docs/development.md#branch-naming) and
[`docs/development.md`](docs/development.md#commit-format) for the exact
patterns, what's actually lint-enforced versus convention-only, and how each is
checked locally (git hooks) and in CI.

## Merging

This repository merges pull requests via **squash merge only**, keeping a linear
history on `main`. Your commits within a PR don't need to follow the format
above individually, but the final PR title does, since it becomes the squashed
commit message.

## CI

The `CI passed` check must be green before a pull request can be merged. This
includes formatting, linting, type-checking, unused-code detection, and tests.
`bun run check` runs the first four; it does **not** run the test suite. Run
both `bun run check` and `bun run test` locally before opening a PR to catch
issues early.

## Reporting security issues

Do not open a public issue for a security vulnerability. Report it privately as
described in [`.github/SECURITY.md`](.github/SECURITY.md).
