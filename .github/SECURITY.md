# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities **privately**, either via GitHub's
built-in Private Vulnerability Reporting or by email:

**→
[Open a security advisory](https://github.com/AndryOre/bookmarks-import-export/security/advisories/new)**

**→ Or email [hello@andryore.dev](mailto:hello@andryore.dev)**

Do **not** open a public issue for security reports — that exposes the
vulnerability before a fix is available.

**Response times:**

| Severity | Acknowledge (target) | Patch target |
| -------- | -------------------- | ------------ |
| Critical | 48 h                 | 7 days       |
| High     | 5 days               | 14 days      |
| Medium   | 10 days              | 30 days      |

## Supported Versions

Only the latest published version of the extension is supported. There are no
maintained release branches — a fix lands on `main` and ships in the next
release.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Upgrade Path

Fixes ship through the Chrome Web Store's auto-update mechanism: once a patch is
published, installs update automatically in the background, with no action
required from you. There's no separate patch channel or manual download step.

## Credit

Reporters are credited by name (or handle) in the GitHub Security Advisory and
in [`CHANGELOG.md`](../CHANGELOG.md), unless you ask to stay anonymous when you
report. Let us know your preference in the initial report.

## Security Design

For what security this extension provides — its threat model, the permissions it
requests and why, and how it handles malformed or hostile import files — see
[`docs/security.md`](../docs/security.md).
