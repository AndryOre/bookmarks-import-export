# Store screenshots

Chrome Web Store screenshots for Snug v2.0.0: one global English set of five
1280x800 slides in `docs/store/assets/screenshots/` (flat folder, no locale
subfolders). Each slide is an English caption on the aurora ground over a crop
of the real built extension, seeded with example bookmarks. One global set
covers both the English and Spanish listings.

## Shot list

| Order | File                 | Headline                        | What it shows                                                                  |
| ----- | -------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| 1     | `01-export.png`      | Export exactly what you choose  | Export page: folder tree with Development checked, format chips, Export button |
| 2     | `02-import.png`      | Preview every import first      | Import preview of a bookmarks file with the three import modes                 |
| 3     | `03-auto-export.png` | Scheduled backups, hands-free   | Auto-export switched on, with the last and next run                            |
| 4     | `04-popup.png`       | Export everything in one click  | The toolbar popup, centered                                                    |
| 5     | `05-local.png`       | Everything stays on your device | No app UI: the store icon and four local-only claims                           |

Subtitles and the exact copy live in `e2e-store/store-screenshots.spec.ts`. The
copy follows [`docs/brand/voice.md`](../brand/voice.md). Every slide-5 claim is
backed by [`PRIVACY_POLICY.md`](../../PRIVACY_POLICY.md) (no data collected, no
external servers, no third-party analytics) and by the repository itself (MIT
licensed, public on GitHub); "No account needed" matches the listing text in
[`README.md`](README.md).

## Upload order

In the Developer Dashboard, open the Store listing tab and, on the global
(default) set, upload the five files in the order above (1 to 5). The first
screenshot is shown first on the listing, so keep the export slide first. Do not
upload localized sets: the global set applies to every language.

The listing still carries 5 old global screenshots from v1.3.0 plus localized EN
and ES sets. Delete all of them before uploading the new set so nothing old
shows up alongside it.

## Regenerate

```sh
bun run store:screenshots
```

This runs `wxt build` and then Playwright with `playwright.store.config.ts`,
which has a single `en` project. The spec lives in
`e2e-store/store-screenshots.spec.ts`; it is outside `e2e/`, so
`bun run test:e2e` never runs it.

Each run seeds a fresh temporary Chromium profile with example bookmarks (well
known public sites), captures the real UI with `locator.screenshot` at a device
scale factor of 2 into `test-results/store/raw/` (not committed), and composes
the final slides with `e2e-store/compose-slide.ts`. The composer renders a
1280x800 HTML template with `page.setContent`; fonts are embedded from
`docs/brand/brandbook/fonts`, so output does not depend on fonts installed on
the host.

Verify the output with:

```sh
file docs/store/assets/screenshots/*.png
```

Every file must report `1280 x 800`.

## Template

Every slide shares the same layout: the aurora ground (`#17120A` with an amber
glow), a Space Grotesk 600 headline at 60 px, a Geist 26 px subtitle in
`#DCC8A6`, and a UI card from y=220 to the bottom edge (it may be cut off) at
most 1040 px wide, with a 16 px radius, a 1 px border and a soft shadow. The
popup slide centers the popup at about 520 px tall instead, and slide 5 swaps
the card for the store icon over four icon-and-text rows.
