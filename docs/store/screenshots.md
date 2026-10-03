# Store screenshots

Chrome Web Store screenshots for Snug v2.0.0: five 1280x800 slides for each of
the 10 locales (50 PNGs) in `docs/store/assets/screenshots/<locale>/`, plus a
global English set in the flat `docs/store/assets/screenshots/` folder that is
the default. Each slide is a translated caption on the aurora ground over a crop
of the real built extension running in that locale, seeded with example
bookmarks.

## Locales

`en`, `es`, `de`, `fr`, `it`, `ja`, `ko`, `pt_BR`, `ru`, `zh_CN`. The folder
names match `locales/<code>.json`; Chromium is launched with the matching tag
(`pt-BR`, `zh-CN` for the two regional ones). The flat global set is a copy of
the `en/` set.

## Shot list (English captions)

| Order | File                 | Headline                        | What it shows                                                                      |
| ----- | -------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | `01-export.png`      | Export exactly what you choose  | Export page: folder tree with Development checked, six format chips, Export button |
| 2     | `02-import.png`      | Preview every import first      | Import preview of a bookmarks file with the three import modes                     |
| 3     | `03-auto-export.png` | Scheduled backups, hands-free   | Auto-export on (daily, HTML, JSON and Markdown), with the last and next run        |
| 4     | `04-popup.png`       | Export everything in one click  | The toolbar popup, centered                                                        |
| 5     | `05-local.png`       | Everything stays on your device | No app UI: the store icon and four local-only claims                               |

Captions live in `e2e-store/captions.ts` (one entry per locale: five headlines,
four subtitles, four slide-5 claims). Slide 1's subtitle names all six export
formats and slide 3's names the hourly-to-weekly schedules. The copy follows
[`docs/brand/voice.md`](../brand/voice.md). Every slide-5 claim is backed by
[`PRIVACY_POLICY.md`](../../PRIVACY_POLICY.md) (no data collected, no external
servers, no third-party analytics) and by the repository itself (MIT licensed,
public on GitHub); "No account needed" matches the listing text in
[`README.md`](README.md).

## Image sizes

Every PNG is 1280x800. That applies to all 50 locale files and to the 5 flat
files, so each locale folder holds `01-export.png`, `02-import.png`,
`03-auto-export.png`, `04-popup.png` and `05-local.png`.

## Upload order

In the Developer Dashboard, open the Store listing tab. Upload the five files of
a locale in the order above (1 to 5) to that locale's screenshot set; the export
slide stays first. The global (default) set uses the flat English files and
covers any language without its own set. Delete the old v1.3.0 global
screenshots and the old localized EN and ES sets before uploading so nothing old
shows up alongside the new ones.

## Regenerate

```sh
bun run store:screenshots
```

This runs `wxt build` and then Playwright with `playwright.store.config.ts`,
which has one project per locale (`e2e-store/store-locales.ts`). Run a single
locale with `bun run store:screenshots --project=de`. The spec lives in
`e2e-store/store-screenshots.spec.ts`; it is outside `e2e/`, so
`bun run test:e2e` never runs it.

Each run seeds a fresh temporary Chromium profile with example bookmarks (well
known public sites) and the final Auto-export configuration, launches it in the
locale under test, captures the real UI with `locator.screenshot` at a device
scale factor of 2 into `test-results/store/raw/` (not committed), and composes
the final slides with `e2e-store/compose-slide.ts`. The composer renders a
1280x800 HTML template with `page.setContent`; the Latin fonts are embedded from
`docs/brand/brandbook/fonts`, while Cyrillic and CJK captions fall back to the
host's system fonts. The composer throws if a headline or claim row is wider
than 1200 px or a subtitle wraps past two lines, so clipped text fails the run.

Verify the output with:

```sh
file docs/store/assets/screenshots/*.png docs/store/assets/screenshots/*/*.png
```

Every file must report `1280 x 800`.

## Template

Every slide shares the same layout: the aurora ground (`#17120A` with an amber
glow), a Space Grotesk 600 headline at 60 px, a Geist 26 px subtitle in
`#DCC8A6`, and a UI card from y=220 to the bottom edge (it may be cut off) at
most 1040 px wide, with a 16 px radius, a 1 px border and a soft shadow. The
popup slide centers the popup at about 520 px tall instead, and slide 5 swaps
the card for the store icon over four icon-and-text rows.
