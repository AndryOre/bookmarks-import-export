![Bookmark Import/Export](https://res.cloudinary.com/dhwxnbnaj/image/upload/v1722710029/Bookmark%20ImportExport/Cover_zvlu4x.png)

# Bookmark Import/Export

[![Chrome Web Store Version][Chrome Web Store Version]][Chrome Web Store-url]
[![Chrome Web Store Users][Chrome Web Store Users]][Chrome Web Store-url]
[![CI][CI]][CI-url] [![License][License]][License-url]
[![OpenSSF Scorecard][OpenSSF Scorecard]][OpenSSF Scorecard-url]
[![OpenSSF Best Practices][OpenSSF Best Practices]][OpenSSF Best Practices-url]

A browser extension to import and export bookmarks as HTML, JSON or CSV, with
selective export, restore and scheduled backups.

## Features 🌟

- ⬇️⬆️ Export and import bookmarks as HTML, JSON or CSV.
- 🔍 Advanced export: selectively export bookmarks and folders.
- ♻️ Advanced import: preview, then restore (merge or replace) or create a new
  folder.
- 🔁 Scheduled automatic backups straight to your Downloads folder.
- 🌙 Automatic theme and 🌍 language matching.

## Install 🔧

Install from the Chrome Web Store:

[![Chrome Web Store][Chrome Web Store]][Chrome Web Store-url]

While primarily listed on the Chrome Web Store, the extension is compatible with
all Chromium-based browsers (Microsoft Edge, Opera, Brave, etc.) and can be
installed from the same listing on those browsers.

## Privacy 🔒

Bookmark Import/Export makes no network calls — every operation reads and writes
your browser's own bookmarks tree, locally. See the
[Privacy Policy](PRIVACY_POLICY.md) for details.

## Documentation 📖

- [`docs/usage.md`](docs/usage.md) — exporting, importing, and automatic
  backups.
- [`docs/development.md`](docs/development.md) — scripts, git hooks,
  commit/branch conventions, and how `fakeBrowser` testing works.
- [`docs/architecture.md`](docs/architecture.md) — a code map of the codebase's
  shape.
- [`CHANGELOG.md`](CHANGELOG.md) — release notes.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — pull request conventions.
- [`.github/SECURITY.md`](.github/SECURITY.md) — how to report a security
  vulnerability privately.

Built with [WXT](https://wxt.dev/), [React](https://react.dev/),
[Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/),
[Lucide](https://lucide.dev/), and
[TypeScript](https://www.typescriptlang.org/).

## Local Development 🛠️

See [`docs/development.md`](docs/development.md) for the rest.

```bash
git clone https://github.com/AndryOre/bookmarks-import-export.git
cd bookmarks-import-export
bun install
bun run dev
```

## Contributors 🤝

**We welcome your contributions!** See [`CONTRIBUTING.md`](CONTRIBUTING.md) for
setup, branch naming, and commit/PR conventions.

[![Contributors](https://contrib.rocks/image?repo=AndryOre/bookmarks-import-export)](https://github.com/AndryOre/bookmarks-import-export/graphs/contributors)

## License 📄

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

[Chrome Web Store Version]:
  https://img.shields.io/chrome-web-store/v/gdhpeilfkeeajillmcncaelnppiakjhn?style=flat
[Chrome Web Store Users]:
  https://img.shields.io/chrome-web-store/users/gdhpeilfkeeajillmcncaelnppiakjhn?style=flat
[Chrome Web Store]:
  https://img.shields.io/badge/Chrome%20Web%20Store-4285F4.svg?style=flat&logo=Chrome-Web-Store&logoColor=white
[Chrome Web Store-url]:
  https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn
[CI]:
  https://img.shields.io/github/actions/workflow/status/AndryOre/bookmarks-import-export/ci.yml?branch=main&style=flat
[CI-url]:
  https://github.com/AndryOre/bookmarks-import-export/actions/workflows/ci.yml
[License]:
  https://img.shields.io/github/license/AndryOre/bookmarks-import-export?style=flat
[License-url]: LICENSE
[OpenSSF Scorecard]:
  https://api.securityscorecards.dev/projects/github.com/AndryOre/bookmarks-import-export/badge
[OpenSSF Scorecard-url]:
  https://scorecard.dev/viewer/?uri=github.com/AndryOre/bookmarks-import-export
[OpenSSF Best Practices]: https://www.bestpractices.dev/projects/15093/badge
[OpenSSF Best Practices-url]: https://www.bestpractices.dev/projects/15093
