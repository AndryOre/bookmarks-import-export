# Governance

This document describes how Bookmark Import/Export is governed today: who
decides what, how changes get made, and what happens if the maintainer goes
away.

## Model: BDFL

The project follows a Benevolent Dictator For Life (BDFL) model.
[@AndryOre](https://github.com/AndryOre) is the sole maintainer and has final
say over all technical and project decisions, including scope, architecture, and
what gets merged.

## Decision process

1. **Issue first.** Most changes start as a GitHub issue (bug report, feature
   request, or proposal) so the "why" is on the record before any code is
   written.
2. **Pull request.** Implementation happens in a pull request against `main`.
   Every PR must pass CI (formatting, linting, type-checking, unused-code
   detection, and tests — see [`CONTRIBUTING.md`](CONTRIBUTING.md)) before it
   can be merged. Pull requests are merged via **squash merge only**, keeping a
   linear history on `main`.
3. **ADR for hard-to-reverse choices.** Decisions that are expensive to reverse
   — architecture, security posture, or anything that changes how contributors
   work — are recorded as an Architecture Decision Record under
   [`docs/adr/`](docs/adr/), not just discussed in a PR description.

## Roles and responsibilities

### Maintainer

The maintainer (currently @AndryOre) triages issues, reviews and merges pull
requests, cuts releases, makes final calls on scope and design, and is
responsible for the project's security posture (see
[`.github/SECURITY.md`](.github/SECURITY.md)).

### Contributor

Anyone who opens an issue, submits a pull request, or participates in discussion
is a contributor. Contributors are expected to follow
[`CONTRIBUTING.md`](CONTRIBUTING.md)'s conventions and the
[Code of Conduct](CODE_OF_CONDUCT.md). Contributing does not require any formal
application or approval step.

## Becoming a maintainer

There is no fixed process today, since the project has had a single maintainer
since its creation. In practice, a contributor who consistently sends
high-quality pull requests, participates in review, and demonstrates good
judgment about the project's scope and direction would be a candidate for
maintainer access. Reach out via a GitHub issue or discussion to express
interest.

## Continuity

There is currently no backup maintainer. If @AndryOre becomes unavailable for an
extended period, the project may pause — issues and pull requests may go
unreviewed until the maintainer returns or a successor is found. This is an open
invitation: if you are interested in becoming a backup maintainer, please open
an issue to start that conversation.

## Code of Conduct

All participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).
