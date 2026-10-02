# Store screenshots

Localized Chrome Web Store screenshots for Snug v2.0.0, generated from the real
built extension. Every PNG is 1280x800, dark theme, raw capture (no captions).

## Shot list

The same five shots exist per locale, under `docs/store/assets/screenshots/en/`
(English UI) and `docs/store/assets/screenshots/es/` (Spanish UI, with Spanish
folder names in the seeded bookmarks).

| Order | File                 | What it shows                                                                                  |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------- |
| 1     | `01-export.png`      | Export page with the seeded folder tree expanded and one folder selected                       |
| 2     | `02-import.png`      | Import preview of a bookmarks file with the three import modes (create folder, merge, replace) |
| 3     | `03-auto-export.png` | Auto-export page switched on, with the next scheduled run visible                              |
| 4     | `04-popup.png`       | The toolbar popup, centered on the Snug dark background                                        |
| 5     | `05-welcome.png`     | Welcome hero with the Snug wordmark and the three quick-start actions                          |

## Upload order

In the Developer Dashboard, open the Store listing tab, then for each language
(English, Spanish) upload the five files in the order above (1 to 5). The first
screenshot is the one shown first on the listing, so keep the export page first.

The listing still carries 5 old global screenshots from v1.3.0. Delete those in
the dashboard before uploading the localized sets, so they do not show up
alongside the new ones.

## Regenerate

```sh
bun run store:screenshots
```

This runs `wxt build` and then Playwright with `playwright.store.config.ts`,
which has one project per locale (`en`, `es`). The spec lives in
`e2e-store/store-screenshots.spec.ts`; it is outside `e2e/`, so
`bun run test:e2e` never runs it.

Each run seeds a fresh temporary Chromium profile with example bookmarks (well
known public sites) and asserts that the page headings render in the project
locale before capturing, so a wrong-language set fails instead of being written.

Verify the output with:

```sh
file docs/store/assets/screenshots/*/*.png
```

Every file must report `1280 x 800`.

## Forcing the browser language

Chromium's `--lang=es` flag alone does not switch the extension locale in this
setup. The fixture (`e2e/fixtures.ts`, option `browserLocale`) passes all three
of Playwright's `locale` launch option, `--lang` and the `LANGUAGE` environment
variable. Playwright's default `en-US` locale emulation otherwise overrides
`chrome.i18n` as soon as a page opens.
