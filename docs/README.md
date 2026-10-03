# Documentation index

An index of every document in this repository.

## Core

- [`README.md`](../README.md) — user-facing portal: pitch, features, install,
  and links to the rest of the docs.
- [`CHANGELOG.md`](../CHANGELOG.md) — human-readable release notes, newest
  first, in [Keep a Changelog](https://keepachangelog.com/) format.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — pull request conventions: setup,
  branch/commit format, merging, CI, security reporting.
- [`GOVERNANCE.md`](../GOVERNANCE.md) — the BDFL governance model, decision
  process, roles, and project continuity.
- [`ROADMAP.md`](../ROADMAP.md) — the project's direction for the next 12 months
  and what's out of scope.
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
- [`docs/adr/0004-enable-codeql-sast.md`](adr/0004-enable-codeql-sast.md) — the
  ADR documenting why CodeQL now runs (superseding ADR 0001's rejection) and the
  accepted branch-protection limitation.
- [`docs/adr/0005-store-publishing-via-cws-api-v2.md`](adr/0005-store-publishing-via-cws-api-v2.md)
  — the ADR documenting why the release workflow publishes to the Chrome Web
  Store through API v2.
- [`docs/adr/0006-single-app-hash-routed-shell.md`](adr/0006-single-app-hash-routed-shell.md)
  — the ADR documenting the single hash-routed App shell that replaced the four
  full-tab pages.
- [`docs/adr/0007-legacy-page-redirects.md`](adr/0007-legacy-page-redirects.md)
  — the ADR documenting the legacy v1 page redirects, the only extra
  entrypoints.
- [`docs/adr/0008-safety-snapshot-in-extension-storage.md`](adr/0008-safety-snapshot-in-extension-storage.md)
  — the ADR documenting why the Safety snapshot lives in extension storage and
  in a download.

## How-to

- [`docs/usage.md`](usage.md) — exporting, importing, duplicates, the Safety
  snapshot and Undo, and Auto-export.
- [`docs/how-to/add-a-locale.md`](how-to/add-a-locale.md) — steps to add a new
  locale.
- [`docs/how-to/cut-a-release.md`](how-to/cut-a-release.md) — steps to cut a new
  release.

## Store

- [`docs/store/README.md`](store/README.md) — the Chrome Web Store listing pack
  for v2.0.0: English and Spanish listing copy, graphic assets, privacy-tab
  justifications, distribution, and the pre-publish checklist.
- [`docs/store/screenshots.md`](store/screenshots.md) — the store screenshot
  shot list and how the slides are produced.
- [`docs/store/listings/`](store/listings/) — listing copy for the other eight
  locales (`TEMPLATE.md` plus one file per locale).
- [`docs/store/baseline-2026-09.md`](store/baseline-2026-09.md) — pre-rename
  store analytics, for comparison after the rename.

## Brand

- [`docs/brand/README.md`](brand/README.md) — the Snug brand kit: what each file
  is and where shared assets live.
- [`docs/brand/voice.md`](brand/voice.md) — brand voice guidelines.
- [`docs/brand/brief.md`](brand/brief.md),
  [`docs/brand/naming.md`](brand/naming.md),
  [`docs/brand/competitors.md`](brand/competitors.md),
  [`docs/brand/copy.md`](brand/copy.md) — the brief, naming rationale,
  competitor research, and listing/product copy.

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
