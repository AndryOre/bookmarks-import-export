# 4. Enable CodeQL SAST

## Status

Accepted — supersedes the CodeQL item in
[ADR 0001](0001-public-repo-security-posture.md)

## Context

ADR 0001 rejected CodeQL on the grounds that the extension has no dangerous
sinks and makes no network calls. That premise no longer holds: the repository
now contains untrusted-file importers — code that parses bookmark export files
(HTML, JSON, CSV) supplied by the user at runtime — which is exactly the kind of
attack surface static analysis exists to cover. A parser working over
attacker-influenced input is exposed to ReDoS (a pathological regular
expression), prototype pollution (an object literal merged from parsed input),
and incomplete sanitization (import data rendered without escaping). None of
these require `innerHTML`, `eval`, or a network call to be real, and CodeQL's
`javascript-typescript` query pack covers all three.

## Decision

- **New `.github/workflows/codeql.yml`** runs CodeQL's `init` and `analyze`
  actions against the `javascript-typescript` language on `pull_request`, on
  `push` to `main`, and weekly on a `schedule`, following this repo's existing
  SHA-pinning style (`scorecard.yml`, `ci.yml`): every action is pinned to a
  commit SHA with a version comment.
- **Least-privilege permissions**: the workflow's top-level `permissions` is
  `{}`; the `analyze` job grants only `security-events: write` (required to
  upload SARIF) and `contents: read`. `persist-credentials: false` on checkout,
  matching every other workflow in this repo.
- **Not a required check.** CodeQL findings are informational, surfaced via code
  scanning, not gating merges — consistent with how Scorecard is treated in
  `scorecard.yml`.

## Consequences

- Raises the OpenSSF Scorecard SAST check score and satisfies the OpenSSF Best
  Practices (bestpractices.dev) silver criterion
  `static_analysis_common_vulnerabilities`.
- CodeQL analysis is not part of the `CI passed` aggregator; a finding doesn't
  block a PR from merging, matching Scorecard's treatment and ADR 0001's "solo
  maintainer" merge model.

### Branch protection

This repo's ruleset (ADR 0001) is already maximal for a solo maintainer: 0
required approvals, since a solo maintainer can never approve their own PR. The
remaining OpenSSF Scorecard Branch-Protection points require ≥1 approving
review, which is structurally impossible for a single-maintainer repository
without a bypass actor. That gap is accepted, not worked around.
