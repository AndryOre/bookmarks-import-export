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
- [`GOVERNANCE.md`](GOVERNANCE.md) — how the project is governed and how
  decisions get made.
- [`ROADMAP.md`](ROADMAP.md) — where the project is headed.
- [`.github/SECURITY.md`](.github/SECURITY.md) — how to report a security
  vulnerability privately.

**Built with**

[![WXT][WXT]][WXT-url] [![React][React]][React-url]
[![TailwindCSS][TailwindCSS]][TailwindCSS-url]
[![Shadcn/UI][Shadcn/UI]][Shadcn/UI-url] [![Lucide][Lucide]][Lucide-url]
[![TypeScript][TypeScript]][TypeScript-url]

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
  https://chromewebstore.google.com/detail/gdhpeilfkeeajillmcncaelnppiakjhn
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
[WXT]:
  https://img.shields.io/badge/WXT-67D55E.svg?style=for-the-badge&logo=WXT&logoColor=white
[WXT-url]: https://wxt.dev/
[React]:
  https://img.shields.io/badge/React-61DAFB.svg?style=for-the-badge&logo=React&logoColor=black
[React-url]: https://react.dev/
[TailwindCSS]:
  https://img.shields.io/badge/Tailwind%20CSS-06B6D4.svg?style=for-the-badge&logo=Tailwind-CSS&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[Shadcn/UI]:
  https://img.shields.io/badge/shadcn%2Fui-000000.svg?style=for-the-badge&logo=shadcn%2Fui&logoColor=white
[Shadcn/UI-url]: https://ui.shadcn.com/
[Lucide]:
  https://img.shields.io/badge/Lucide-F56565.svg?style=for-the-badge&logo=Lucide&logoColor=white
[Lucide-url]: https://lucide.dev/
[TypeScript]:
  https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
