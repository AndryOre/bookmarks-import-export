# 1. Public repo security posture

## Status

Accepted

## Context

`bookmarks-import-export` is a public repository maintained by one person. It
had no branch protection, no repository rulesets, and its security and community
settings were close to GitHub's defaults. A survey of current (2025-2026) GitHub
documentation, the OpenSSF SCM best-practices guide and OpenSSF Scorecard's
checks produced a set of settings to adopt, plus several that were deliberately
rejected for this repository.

## Decision

### Adopted

- **Repository rulesets** on `main` (no bypass actors) and on `v*` tags, in
  place of classic branch protection.
- **0 required approvals** on the `main` ruleset's pull-request rule. A solo
  maintainer can never approve their own PR, so requiring 1+ approvals would
  force a bypass actor — which Scorecard's Branch-Protection check treats as
  admins not being enforced. Zero approvals keeps the PR mandatory and CI-gated
  without that trade-off.
- **Squash-only merges**, linear history, signed commits (GitHub signs squash
  merges done on the web), and a `CI passed` aggregator job as the one required
  status check name, so adding CI jobs later never requires touching the
  ruleset.
- **Every PR runs the full CI gate**, including docs-only changes —
  `paths-ignore` was removed from `ci.yml`. This closes a gap an AI-driven
  contribution workflow could otherwise slip through.
- **Immutable releases**, private vulnerability reporting, SHA-pinned Actions
  (`sha_pinning_required`), and restrictive fork-PR workflow approval.
- **OpenSSF Scorecard**, run on a schedule and on push to `main`, with results
  published and a README badge. Not a required check.
- **OpenSSF Best Practices (bestpractices.dev) badge**, registered manually by
  the maintainer, since the platform requires a GitHub OAuth login with no
  practical write API.
- Docs-lint parity with `andryore-dev` (`bun run lint:docs`, a local lychee
  wrapper).

### Rejected

- **CodeQL** — the extension has no dangerous sinks (no `innerHTML`, `eval`, or
  dynamic `href`s), React escapes JSX text, and it makes no network calls.
  User-supplied bookmark files are parsed at runtime inside the installed
  extension, not in this repository. Superseded by
  [ADR 0004](0004-enable-codeql-sast.md).
- **`bun audit` as a CI gate** — every current advisory traces to WXT's dev-only
  dependency chain and never ships in the built zip. Renovate's
  `osvVulnerabilityAlerts` already covers real supply-chain risk.
- **`actions/dependency-review-action`** — GitHub's dependency graph does not
  parse `bun.lock`; it would only see direct version ranges from `package.json`,
  which OSV-based alerts already cover better.
- **`step-security/harden-runner`** — a third-party, root-level agent in every
  job, for a repository with no runtime secrets and already-pinned actions. Not
  enough exposure to justify the ongoing allowlist upkeep.
- **A merge queue** — unavailable on personal-account repositories, and
  unnecessary for a solo maintainer with `allow_update_branch` and auto-merge.
- **Code-owner review** — no benefit with a single owner.
- **Dependabot alerts and security updates** — turned off entirely by choice,
  since Renovate (with `osvVulnerabilityAlerts`) is the single source of
  dependency-update and vulnerability handling. This leaves Renovate's
  GitHub-alert-sourced `vulnerabilityAlerts` block with nothing to read;
  `osvVulnerabilityAlerts` is the effective source.
- **Bundle-size gate** — no content scripts, installs once; nobody notices zip
  size. Reported in the CI job summary only.

### Settings application

The rulesets, merge, security, Actions, feature and metadata settings were
applied by a script kept in `scripts/repo-settings/` rather than a one-off,
uncommitted script, because this repository was rewritten under
`AndryOre/bookmarks-import-export-new` and later migrated back into this repo.
The script took the target `owner/repo` as an argument and was idempotent, so it
ran once against `-new` and once against this repo after the migration. It was
deleted once that migration completed; it was never meant to be permanent
settings-as-code infrastructure.

## Consequences

- A solo maintainer can still merge their own PRs, but only through a PR —
  direct pushes to `main` are blocked by the ruleset for everyone, admin
  included.
- Scorecard's score is expected to land around 5-7/10. Checks that need multiple
  reviewers or a second contributor (Code-Review, Contributors, Fuzzing) can't
  be fixed by a solo repository and are treated as inherent to the constraint,
  not treated as work items.
- Docs-only PRs now spend CI minutes on the full quality/build pipeline where
  they previously skipped it. This is deliberate: a stricter gate applies
  equally regardless of who or what opens the PR.
- The `scripts/repo-settings/` folder was temporary technical debt, removed once
  the repository migration (the trigger it was waiting on) completed.
