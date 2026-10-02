# Chrome Web Store listing pack for Snug v2.0.0

A field-by-field mirror of the Chrome Web Store Developer Dashboard for Snug
v2.0.0. Every field is a plain-text block you can copy straight into the
dashboard, with a character count next to each limited field. Nothing in this
pack has been uploaded or submitted.

The live listing is still "Bookmark Import/Export" v1.3.0 (old name, old copy,
old screenshots, a two-permission privacy tab and URLs on the old repository
slug). The "current" values quoted below come from a dashboard snapshot taken on
2026-10-01.

Related files:

- [`screenshots.md`](screenshots.md) — the localized EN and ES screenshot sets.
- [`baseline-2026-09.md`](baseline-2026-09.md) — pre-rename analytics, for
  comparison after the rename.
- [`assets/`](assets/) — promo tiles and screenshots.

## Findings that need action

1. Five permissions are new since v1.3.0 (`storage`, `tabs`, `alarms`,
   `downloads`, `offscreen`) and each needs a justification on the Privacy tab.
2. `tabs` is almost certainly unnecessary and is a reviewer-flag risk. See
   [Pre-publish checklist](#pre-publish-checklist).
3. The single-purpose text must now cover CSV and scheduled backups, not only
   JSON and HTML.
4. Every URL moves to `AndryOre/snug`. The live listing still uses the old
   repository slug in the homepage, support and privacy URLs.
5. The 5 old global screenshots must be removed in favor of the localized EN and
   ES sets.
6. The title needs a manifest-only name key to carry a descriptor. That is a
   code change and is not part of this pack.

## Store listing

Locales: English (default) and Spanish. Fill each locale on its own tab.

### Package-sourced fields

The title and summary shown on the Store listing tab are read from the uploaded
package (`__MSG_extensionName__` and `__MSG_extensionDescription__`). They
cannot be typed into the dashboard. The values below are what the package must
contain.

### English (en, default)

Title, current manifest value (4 chars):

```text
Snug
```

Title, proposed with descriptor (38 chars, limit 75). Needs the manifest-only
name key described in the checklist:

```text
Snug: Bookmark Export, Import & Backup
```

Summary, from `locales/en.json` `extensionDescription` (129 chars, limit 132):

```text
Export, import, and schedule automatic backups for your bookmarks — HTML, JSON, or CSV, all on your device, no account, no cloud.
```

Detailed description, from [`docs/brand/copy.md`](../brand/copy.md) section 1
(891 chars):

```text
Snug moves your bookmarks between browsers, exactly as you left them — nothing sent anywhere, no account required.

Export your whole bookmark tree or just the folder you choose, as HTML, JSON, or CSV. Import back with a preview first, then merge into your existing bookmarks, replace them outright, or drop everything into a new folder — your call every time.

Set up a schedule once and Snug backs up your bookmarks straight to your Downloads folder on its own, in the formats and at the interval you pick. Filenames can include the date and time automatically, so nothing gets overwritten or confused with the last one.

Snug runs entirely on your device — no account, no cloud, no server. Every operation reads and writes your browser's own bookmarks tree, and that's the whole trust story. Works on Chrome and any other Chromium-based browser (Edge, Opera, Brave) from the same listing.
```

### Spanish (es)

Title, current manifest value (4 chars):

```text
Snug
```

Title, proposed with descriptor (44 chars, limit 75):

```text
Snug: exporta, importa y respalda marcadores
```

Summary, from `locales/es.json` `extensionDescription` (109 chars, limit 132):

```text
Programa respaldos automáticos de tus marcadores, exporta e importa en HTML, JSON o CSV — sin cuenta ni nube.
```

`copy.md` carries a longer Spanish summary (134 chars, over the limit). The
locale file is the source of truth and the 109-char string above is the one that
ships. Do not use the `copy.md` variant.

Detailed description, from [`docs/brand/copy.md`](../brand/copy.md) section 1
(977 chars):

```text
Snug mueve tus marcadores entre navegadores, tal como los dejaste — no se envían a ningún lado, y no necesitas cuenta.

Exporta todo tu árbol de marcadores o solo la carpeta que elijas, en HTML, JSON o CSV. Al importar, primero ves una vista previa y luego decides: combinarlos con tus marcadores actuales, reemplazarlos por completo, o guardarlo todo en una carpeta nueva — tú decides cada vez.

Configura un horario una sola vez y Snug respalda tus marcadores directo a tu carpeta de Descargas, en los formatos y con la frecuencia que elijas. Los nombres de archivo pueden incluir la fecha y hora automáticamente, así nunca se confunden ni se sobrescriben entre sí.

Snug funciona completamente en tu dispositivo — sin cuenta, sin nube, sin servidor. Cada operación lee y escribe directamente en los marcadores de tu navegador, y esa es toda la historia de confianza. Funciona en Chrome y en cualquier navegador basado en Chromium (Edge, Opera, Brave) desde el mismo listado.
```

### Fields shared by both locales

Category:

```text
Tools
```

Languages: English and Spanish (unchanged from v1.3.0).

Official URL: none (unchanged).

Homepage URL:

```text
https://github.com/AndryOre/snug
```

Support URL:

```text
https://github.com/AndryOre/snug/issues
```

Privacy policy URL (`PRIVACY_POLICY.md` exists at the repository root and is
titled "Privacy Policy for Snug"):

```text
https://github.com/AndryOre/snug/blob/main/PRIVACY_POLICY.md
```

Mature content: off (unchanged).

Google Analytics (GA4): the v1.3.0 listing is opted in, and the dashboard allows
opting out. This is store-page analytics on the dashboard side. The extension
itself makes no network calls and contains no analytics code. Keep the current
choice unless you want a listing with no analytics property at all.

## Graphic assets

| Asset            | Size     | Source                             | Notes                                         |
| ---------------- | -------- | ---------------------------------- | --------------------------------------------- |
| Store icon       | 128x128  | `assets/icon.png`                  | Same source file the build uses for the icon. |
| Small promo tile | 440x280  | `assets/small-tile-440x280.png`    | Both locales.                                 |
| Marquee tile     | 1400x560 | `assets/marquee-1400x560.png`      | Both locales.                                 |
| Screenshots      | see list | [`screenshots.md`](screenshots.md) | Localized EN set and localized ES set.        |
| Promo video      | none     |                                    | None set on v1.3.0; none planned.             |

The two tile paths above are relative to this folder (`docs/store/`). The icon
path is relative to the repository root.

Screenshots: the v1.3.0 listing carries 5 global screenshots plus 5 localized
for each of EN and ES. All 5 global screenshots show the old product and must be
removed. Upload the localized EN and ES sets from `screenshots.md` instead, so
each locale shows its own language and no global fallback remains.

## Privacy

### Single purpose

Single purpose description (320 chars, limit 1000):

```text
Snug lets people export their browser bookmarks to HTML, JSON, or CSV files, import bookmarks from those same formats, and schedule automatic bookmark backups that save files to the Downloads folder. Everything happens on the user's device, for the purpose of backing up, moving, and restoring bookmarks across browsers.
```

### Permission justifications

One justification per permission declared in `wxt.config.ts`. Each is grounded
in the code that uses it.

`bookmarks` (331 chars):

```text
Snug reads the bookmarks tree to export it as HTML, JSON, or CSV, and creates bookmarks and folders when the user imports a file. This is the extension's core function: backing up, moving, and restoring bookmarks. Bookmarks are only read when the user starts an export or import, or when a backup schedule the user configured runs.
```

Code: `lib/exporters/export-html.ts`, `lib/exporters/export-json.ts` and
`lib/exporters/export-csv.ts` call `browser.bookmarks.getTree()`;
`components/export/bookmark-tree.tsx` calls it to show the folder picker;
`lib/export-all-bookmarks.ts` calls it for full exports.

`favicon` (286 chars):

```text
Snug reads each bookmark's cached site icon from the browser's own favicon cache to show it next to the bookmark in the folder picker and, when the user turns the option on, to embed it in exported files. Icons come from the browser cache, so no request is made to the bookmarked sites.
```

Code: `lib/favicon.ts` builds the `_favicon` API URL (`getFaviconUrl`) and
resolves base64 data (`getFaviconBase64`); it is used by
`components/export/bookmark-tree.tsx` and the three exporters in
`lib/exporters/`.

`storage` (251 chars):

```text
Snug stores the user's own settings on their device: theme, export options, the filename template, the last export format, and the backup schedule with its last and next run times. Nothing is synced or sent anywhere, and no bookmark content is stored.
```

Code: `lib/storage.ts` defines every setting with `storage.defineItem` under a
`local:` key, which uses `chrome.storage.local`. The background worker watches
`autoExportConfigStore` in `entrypoints/background.ts`.

`tabs` (188 chars). Recommended to remove before publishing; use this text only
if the permission stays in the package:

```text
Snug opens its own app page in a new tab from the popup, and opens the browser's bookmark manager after an import. It does not read the URL, title, or content of any tab the user has open.
```

Code: `browser.tabs.create` in `entrypoints/background.ts` (welcome and what's
new pages), `components/popup/footer.tsx` (open app, settings) and
`entrypoints/app/routes/import.tsx` (open `chrome://bookmarks`). Nothing reads
`tab.url`, `tab.title` or runs `tabs.query`. `tabs.create` needs no permission.

`alarms` (259 chars):

```text
Snug uses one alarm to run the backup schedule the user configured, for example daily or weekly. The alarm wakes the extension at the chosen time so it can export bookmarks to the Downloads folder. There is no alarm unless the user turns scheduled backups on.
```

Code: `lib/auto-export.ts` creates and clears the `auto-export` alarm
(`ALARM_NAME`); `entrypoints/background.ts` listens with
`browser.alarms.onAlarm` and also re-syncs the alarm on install, startup and
config changes.

`downloads` (225 chars):

```text
Snug uses the downloads API to save scheduled backups and "Export now" runs to the user's Downloads folder, in a configurable subfolder. It only downloads files that Snug generated on the device from the user's own bookmarks.
```

Code: `lib/offscreen-download.ts` calls `browser.downloads.download` and watches
`browser.downloads.onChanged`; `lib/auto-export.ts` builds the filename and
folder prefix passed to it. Exports started from the Export page and the popup
do not use this permission: they save through an `<a download>` click in
`triggerDownload` (`lib/export-all-bookmarks.ts`).

`offscreen` (307 chars):

```text
Snug creates a short-lived offscreen document to turn an exported bookmark file into a Blob URL, because a service worker cannot create one and a data URL is too large for big bookmark libraries. The document is created for the download and closed when it finishes. It has no UI and loads no remote content.
```

Code: `lib/offscreen-download.ts` calls `chrome.offscreen.createDocument` with
the `BLOBS` reason and closes it with `chrome.offscreen.closeDocument`;
`entrypoints/offscreen/main.ts` handles the create and revoke messages.

### Other privacy fields

| Field           | Value                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Remote code     | No, I am not using remote code.                                                                 |
| Data usage      | Check no data categories. Snug collects none.                                                   |
| Certification 1 | I do not sell or transfer user data to third parties, outside of the approved use cases.        |
| Certification 2 | I do not use or transfer user data for purposes that are unrelated to my item's single purpose. |
| Certification 3 | I do not use or transfer user data to determine creditworthiness or for lending purposes.       |

All three certifications are ticked, as on v1.3.0.

Privacy policy URL:

```text
https://github.com/AndryOre/snug/blob/main/PRIVACY_POLICY.md
```

## Distribution

Unchanged from v1.3.0.

| Field      | Value                                       |
| ---------- | ------------------------------------------- |
| Payments   | Free of charge                              |
| Visibility | Public                                      |
| Regions    | All regions, including all unlisted regions |

## Pre-publish checklist

1. **Add a manifest-only name key.** The store title should carry the descriptor
   while the UI keeps "Snug". Add a locale key such as `extensionManifestName`
   to `locales/en.json` and `locales/es.json` with the two titles above, and
   point `manifest.name` in `wxt.config.ts` at it
   (`__MSG_extensionManifestName__`). UI strings keep using `extensionName`. Not
   implemented in this pack.
2. **Verify and remove the `tabs` permission.** Only `browser.tabs.create` is
   used (`entrypoints/background.ts`, `components/popup/footer.tsx`,
   `entrypoints/app/routes/import.tsx`) and it needs no permission. A broad
   `tabs` permission with no `tab.url` use is a common reviewer flag and shows a
   wider warning at install. Remove it from `wxt.config.ts`, run the tests, and
   load the build to confirm the popup, welcome page and import flow still open
   tabs. Then the `tabs` justification above is dropped from the form.
3. **Know what the tag does.** Pushing the `v2.0.0` tag triggers `release.yml`,
   which builds the zip, publishes the GitHub Release and runs `wxt submit`
   against the Chrome Web Store API (see
   [ADR 0005](../adr/0005-store-publishing-via-cws-api-v2.md)). The API only
   uploads and submits the package. Listing text, screenshots, tiles and privacy
   fields stay dashboard-managed. Finish the dashboard work first, or the
   submission goes for review with the old listing data.
4. **Recommended order in the dashboard.**
   1. Land checklist items 1 and 2 on `main` and confirm `bun run check` and
      `bun run test` pass.
   2. Open the item's draft in the Developer Dashboard. Do not submit yet.
   3. Store listing tab, English: summary and description are package-sourced,
      so enter the detailed description, category, homepage URL and support URL.
      Remove the 5 global screenshots, then upload the EN screenshots, the small
      tile, the marquee and the icon.
   4. Store listing tab, Spanish: same fields with the ES text and the ES
      screenshots.
   5. Privacy tab: single purpose, one justification per remaining permission,
      remote code No, no data categories, three certifications, privacy policy
      URL.
   6. Distribution tab: confirm free, public, all regions.
   7. Push the `v2.0.0` tag so `wxt submit` uploads the package. The title and
      summary then update from the package manifest.
   8. In the dashboard, add the rename announcement below to the reviewer notes,
      then submit for review. Check the draft's package-sourced title reads
      `Snug: Bookmark Export, Import & Backup`.
   9. After publication, compare analytics against
      [`baseline-2026-09.md`](baseline-2026-09.md).
5. **Rename announcement.** From `copy.md` section 2. Use it in the reviewer
   notes and in any user communication.

   English:

   ```text
   This extension has a new name: Snug. Same extension, same local-only promise — export, import, and scheduled backups for your bookmarks, with nothing ever sent anywhere. Nothing about your data or settings changes; only the name and the icon do.
   ```

   Spanish:

   ```text
   Esta extensión tiene un nuevo nombre: Snug. La misma extensión, la misma promesa de siempre: exportar, importar y respaldar tus marcadores según el horario que configures, sin enviar nada a ningún lado. Tus datos y tu configuración no cambian — solo el nombre y el ícono.
   ```
