# Documentation index

An index of every document in this repository.

## Core

- [`README.md`](../README.md) — user-facing portal: pitch, features, install,
  and links to the rest of the docs.
- [`CHANGELOG.md`](../CHANGELOG.md) — human-readable release notes, newest
  first, in [Keep a Changelog](https://keepachangelog.com/) format.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — pull request conventions: setup,
  branch/commit format, merging, CI, security reporting.
- [`docs/development.md`](development.md) — the local development guide:
  scripts, git hooks, CI, commit/branch format, the `@shadcn/lint` contract
  workflow, `fakeBrowser` testing, and the code documentation policy.
- [`docs/architecture.md`](architecture.md) — a matklad-style code map of the
  codebase's shape: runtime contexts, data flows, and invariants.
- [`CONTEXT.md`](../CONTEXT.md) — a glossary of domain terms used consistently
  across code, docs, and UI.
- [`docs/adr/0001-public-repo-security-posture.md`](adr/0001-public-repo-security-posture.md)
  — the ADR documenting this repo's GitHub security/settings target state.
- [`docs/adr/0002-tsdoc-only-code-comments.md`](adr/0002-tsdoc-only-code-comments.md)
  — the ADR documenting the TSDoc-only code comment policy and why it's
  lint-enforced.
- [`docs/adr/0003-e2e-against-built-extension.md`](adr/0003-e2e-against-built-extension.md)
  — the ADR documenting why E2E runs Playwright against the built extension
  (`wxt build` output) instead of a component-test layer, and why bookmarks are
  seeded/read through the extension's service worker.

## How-to

- [`docs/usage.md`](usage.md) — exporting, importing, and automatic backups.
- [`docs/how-to/add-a-locale.md`](how-to/add-a-locale.md) — steps to add a new
  locale.
- [`docs/how-to/cut-a-release.md`](how-to/cut-a-release.md) — steps to cut a new
  release.

## Agent configuration

- [`AGENTS.md`](../AGENTS.md) — instructions for coding agents: stack summary,
  scripts to run, conventions, and escalation ladders.
- [`docs/agents/domain.md`](agents/domain.md) — how domain-modeling-aware skills
  should use this repo's domain docs.
- [`docs/agents/forge.md`](agents/forge.md) — repo-specific config for the
  `/forge` command.
- [`docs/agents/issue-tracker.md`](agents/issue-tracker.md) — where issues and
  specs live (Linear) and how to work with them.
- [`docs/agents/triage-labels.md`](agents/triage-labels.md) — the mapping
  between triage roles and this workspace's Linear labels.

## Not covered here

- [`PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) — the extension's published
  privacy policy.
- [`.github/SECURITY.md`](../.github/SECURITY.md) — how to report a security
  vulnerability privately.
- [`docs/security.md`](security.md) — the extension's assurance case: what
  security it provides, its threat model, and its known limitations.
- [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) — the project's code of conduct.
