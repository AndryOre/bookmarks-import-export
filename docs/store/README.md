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

- [`screenshots.md`](screenshots.md) — the global English screenshot set and the
  ten localized sets.
- [`baseline-2026-09.md`](baseline-2026-09.md) — pre-rename analytics, for
  comparison after the rename.
- [`assets/`](assets/) — promo tiles and screenshots.

## Findings

All four findings from the 2026-10-01 dashboard snapshot are resolved in this
pack. Each one still needs its manual dashboard step (see the checklist).

1. **Resolved in the pack:** six permissions are new since v1.3.0 (`storage`,
   `alarms`, `downloads`, `offscreen`, `unlimitedStorage`, `notifications`) and
   each has a justification below. Enter them on the Privacy tab.
2. **Resolved in the pack:** the single-purpose text now covers exporting,
   importing, backing up and cleaning up bookmarks.
3. **Resolved in the pack:** every URL points to `AndryOre/snug`. Replace the
   old repository slug in the dashboard's homepage, support and privacy URLs.
4. **Resolved in the pack:** the old screenshots (global and localized EN/ES)
   are replaced by the new set in [`screenshots.md`](screenshots.md). Delete the
   old ones in the dashboard.

The old `tabs` permission justification is gone: Snug never requested `tabs`, so
there is nothing to enter for it.

## Store listing

Locales: English (default), Spanish, Portuguese (Brazil), French, German,
Japanese, Chinese (Simplified), Russian, Italian and Korean (`en`, `es`,
`pt_BR`, `fr`, `de`, `ja`, `zh_CN`, `ru`, `it`, `ko`). Fill each locale on its
own tab.

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

Title, proposed with descriptor (38 chars, limit 75). Carried by the
manifest-only name key described in the checklist:

```text
Snug: Bookmark Export, Import & Backup
```

Summary, from `locales/en.json` `extensionDescription` (128 chars, limit 132):

```text
Export bookmarks to HTML, JSON, CSV, Markdown, OPML or XBEL, import from Chrome or Safari, and back up on a schedule. All local.
```

Detailed description, from the English listing (copy.md section 1 holds the
original short form; 1330 chars):

```text
Snug moves your bookmarks between browsers, exactly as you left them — nothing sent anywhere, no account required.

Export your whole bookmark tree or just the folder you choose, as HTML, JSON, CSV, Markdown, OPML, or XBEL. Import from HTML, JSON, CSV, XBEL, a Chrome profile Bookmarks file, or Safari bookmarks, with a preview first. Then merge into your existing bookmarks, replace them outright, or drop everything into a new folder — your call every time.

Before any replace, Snug saves a safety snapshot of your bookmarks, so you can Undo it. A Duplicates page finds repeated bookmarks and deletes only the ones you pick, and imports can skip duplicates.

Set up a schedule once — hourly, daily, weekly, and more — and Snug backs up your bookmarks straight to your Downloads folder on its own, in the formats you pick. Retention keeps only the latest backups, and a notification tells you if one fails. Filenames can include the date and time automatically.

Snug runs entirely on your device — no account, no cloud, no server. Every operation reads and writes your browser's own bookmarks tree, and that's the whole trust story. The bookmark tree works fully with the keyboard and screen readers, and Snug speaks 10 languages. Works on Chrome and any other Chromium-based browser (Edge, Opera, Brave) from the same listing.
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

Summary, from `locales/es.json` `extensionDescription` (123 chars, limit 132):

```text
Exporta marcadores a HTML, JSON, CSV, Markdown, OPML o XBEL, importa de Chrome o Safari y respalda con horario. Todo local.
```

The locale file is the source of truth for the Spanish summary. The earlier
134-character `copy.md` variant was over the limit and is retired.

Detailed description (1501 chars):

```text
Snug mueve tus marcadores entre navegadores, tal como los dejaste — no se envían a ningún lado, y no necesitas cuenta.

Exporta todo tu árbol de marcadores o solo la carpeta que elijas, en HTML, JSON, CSV, Markdown, OPML o XBEL. Importa desde HTML, JSON, CSV, XBEL, el archivo Bookmarks de un perfil de Chrome o marcadores de Safari, con una vista previa primero. Luego decides: combinarlos con tus marcadores actuales, reemplazarlos por completo, o guardarlo todo en una carpeta nueva — tú decides cada vez.

Antes de cualquier reemplazo, Snug guarda una copia de seguridad de tus marcadores para que puedas deshacerlo. Una página de Duplicados encuentra marcadores repetidos y elimina solo los que elijas, y al importar puedes omitir duplicados.

Configura un horario una sola vez — cada hora, a diario, cada semana y más — y Snug respalda tus marcadores directo a tu carpeta de Descargas, en los formatos que elijas. La Retención conserva solo los respaldos más recientes, y un aviso te dice si alguno falla. Los nombres de archivo pueden incluir la fecha y hora automáticamente.

Snug funciona completamente en tu dispositivo — sin cuenta, sin nube, sin servidor. Cada operación lee y escribe directamente en los marcadores de tu navegador, y esa es toda la historia de confianza. El árbol de marcadores funciona por completo con el teclado y lectores de pantalla, y Snug habla 10 idiomas. Funciona en Chrome y en cualquier navegador basado en Chromium (Edge, Opera, Brave) desde el mismo listado.
```

### Other locales

Listings for every locale other than English and Spanish live in
[`listings/`](listings/), one file per locale named `<code>.md`. Start from
[`listings/TEMPLATE.md`](listings/TEMPLATE.md).

### Fields shared by all locales

Category:

```text
Tools
```

Languages: English, Spanish, Portuguese (Brazil), French, German, Japanese,
Chinese (Simplified), Russian, Italian and Korean.

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

| Asset            | Size     | Source                             | Notes                                    |
| ---------------- | -------- | ---------------------------------- | ---------------------------------------- |
| Store icon       | 128x128  | `assets/store-icon-128.png`        | Mark at 96 px with transparent padding.  |
| Small promo tile | 440x280  | `assets/small-tile-440x280.png`    | All locales.                             |
| Marquee tile     | 1400x560 | `assets/marquee-1400x560.png`      | All locales.                             |
| Screenshots      | 1280x800 | [`screenshots.md`](screenshots.md) | Five global slides plus five per locale. |
| Promo video      | none     |                                    | None set on v1.3.0; none planned.        |

The paths above are relative to this folder (`docs/store/`). All three images
are generated by `bun run brand:export`.

Screenshots: the v1.3.0 listing carries 5 global screenshots plus 5 localized
for each of EN and ES. All of them show the old product and must be deleted.
Upload the 5 new English screenshots from `screenshots.md` as global, then the 5
localized slides from `assets/screenshots/<locale>/` on each locale's tab.

## Privacy

### Single purpose

Single purpose description (409 chars, limit 1000):

```text
Snug helps people keep their bookmarks portable and safe: export, import, back up and clean up. It exports bookmarks to HTML, JSON, CSV, Markdown, OPML or XBEL files, imports them from HTML, JSON, CSV, XBEL, Chrome profile and Safari files, undoes a replace with a safety snapshot, removes duplicates the user picks, and runs scheduled backups to the Downloads folder. Everything happens on the user's device.
```

### Permission justifications

One justification per permission declared in `wxt.config.ts`. Each is grounded
in the code that uses it.

`bookmarks` (598 chars):

```text
Snug reads the bookmarks tree to export it and to scan for duplicates, and creates bookmarks and folders when the user imports a file. It deletes bookmarks in three cases only: the duplicates the user picks on the Duplicates page, the folders it created when the user cancels an import, and the existing bookmarks a Replace import (or Undo) overwrites, only when the user chooses it. This is the extension's core function: backing up, moving, restoring and cleaning up bookmarks. Bookmarks are only read or changed when the user starts an action, or when a backup schedule the user configured runs.
```

Code: `lib/exporters/export-html.ts`, `lib/exporters/export-json.ts` and
`lib/exporters/export-csv.ts` call `browser.bookmarks.getTree()`;
`components/export/bookmark-tree.tsx` calls it to show the folder picker;
`lib/export-all-bookmarks.ts` calls it for full exports;
`lib/duplicate-selection.ts` calls `bookmarks.remove` for the picked duplicates;
`lib/import-control.ts` calls `bookmarks.removeTree` to roll back a cancelled
import; `lib/importers/import-html.ts` and `lib/importers/import-json.ts` call
it to clear the roots a Replace import (and Undo, via `lib/safety-snapshot.ts`)
overwrites.

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
Snug stores the user's own settings on their device: theme, export options, the filename template, the last export format, and the backup schedule with its last and next run times. Before a "Restore — replace" import it also keeps one safety snapshot of the bookmarks bar and other bookmarks, so the import can be undone. That is bookmark content, stored locally only. Nothing is synced or sent anywhere.
```

Code: `lib/storage.ts` defines every setting with `storage.defineItem` under a
`local:` key, which uses `chrome.storage.local`. The background worker watches
`autoExportConfigStore` in `entrypoints/background.ts`.

`unlimitedStorage`:

```text
Before a "Restore — replace" import, Snug saves one safety snapshot of the user's bookmarks bar and other bookmarks in extension storage, so the import can be undone. A large bookmark library can exceed the default storage quota, so this permission lifts it. Only the latest snapshot is kept, it stays on the device, and nothing is sent anywhere.
```

Code: `lib/safety-snapshot.ts` saves the snapshot with
`storage.defineItem('local:safetySnapshot')`; `lib/run-import.ts` takes it
before every Restore-replace. See
[ADR 0008](../adr/0008-safety-snapshot-in-extension-storage.md).

`alarms` (267 chars):

```text
Snug uses one alarm to run the backup schedule the user configured, for example hourly, daily or weekly. The alarm wakes the extension at the chosen time so it can export bookmarks to the Downloads folder. There is no alarm unless the user turns scheduled backups on.
```

Code: `lib/auto-export.ts` creates and clears the `auto-export` alarm
(`ALARM_NAME`); `entrypoints/background.ts` listens with
`browser.alarms.onAlarm` and also re-syncs the alarm on install, startup and
config changes.

`downloads` (373 chars):

```text
Snug uses the downloads API to save scheduled backups and "Export now" runs to the user's Downloads folder, in a configurable subfolder. When the user turns on Retention, it also removes the oldest backup files that Snug itself saved, and nothing else, so only the latest ones remain. It only downloads files that Snug generated on the device from the user's own bookmarks.
```

Code: `lib/offscreen-download.ts` calls `browser.downloads.download` and watches
`browser.downloads.onChanged`; `lib/auto-export-retention.ts` calls
`downloads.search`, `downloads.removeFile` and `downloads.erase` for Retention;
`lib/auto-export.ts` builds the filename and folder prefix passed to it. Exports
started from the Export page and the popup do not use this permission: they save
through an `<a download>` click in `triggerDownload`
(`lib/export-all-bookmarks.ts`).

`offscreen` (307 chars):

```text
Snug creates a short-lived offscreen document to turn an exported bookmark file into a Blob URL, because a service worker cannot create one and a data URL is too large for big bookmark libraries. The document is created for the download and closed when it finishes. It has no UI and loads no remote content.
```

Code: `lib/offscreen-download.ts` calls `chrome.offscreen.createDocument` with
the `BLOBS` reason and closes it with `chrome.offscreen.closeDocument`;
`entrypoints/offscreen/main.ts` handles the create and revoke messages.

`notifications` (222 chars):

```text
Snug shows one notification when a scheduled backup fails, so the user finds out that a backup did not happen. Clicking it opens the Auto-export page. There is no other notification, and none is shown when backups succeed.
```

Code: `lib/auto-export-notification.ts` calls `browser.notifications.create` for
the failure notification and `browser.notifications.clear` when the user clicks
it; `entrypoints/background.ts` wires the click listener.

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

1. **Know what the tag does.** Pushing the `v2.0.0` tag triggers `release.yml`,
   which builds the zip, publishes the GitHub Release and runs `wxt submit`
   against the Chrome Web Store API (see
   [ADR 0005](../adr/0005-store-publishing-via-cws-api-v2.md)). The API only
   uploads and submits the package. Listing text, screenshots, tiles and privacy
   fields stay dashboard-managed. Finish the dashboard work first, or the
   submission goes for review with the old listing data.
2. **Recommended order in the dashboard.**
   1. Confirm `main` is green: `bun run check` and `bun run test` pass.
   2. Open the item's draft in the Developer Dashboard. Do not submit yet.
   3. Store listing tab, English: summary and description are package-sourced,
      so enter the detailed description, category, homepage URL and support URL.
      Delete all old screenshots (global, EN and ES), then upload the 5 new
      global screenshots, the small tile, the marquee and the icon.
   4. Store listing tab, every other locale: repeat for Spanish and for each
      file in [`listings/`](listings/). Enter the detailed description, category
      and URLs on each locale's tab, then upload that locale's 5 slides from
      `assets/screenshots/<locale>/` (see [`screenshots.md`](screenshots.md)).
   5. Privacy tab: single purpose, one justification per remaining permission,
      remote code No, no data categories, three certifications, privacy policy
      URL.
   6. Distribution tab: confirm free, public, all regions.
   7. Locale checklist: confirm each locale tab is filled and that its
      package-sourced title and summary match `extensionManifestName` and
      `extensionDescription` in `locales/<code>.json`:
      - [ ] `en` (default)
      - [ ] `es`
      - [ ] `pt_BR`
      - [ ] `fr`
      - [ ] `de`
      - [ ] `ja`
      - [ ] `zh_CN`
      - [ ] `ru`
      - [ ] `it`
      - [ ] `ko`
   8. Push the `v2.0.0` tag so `wxt submit` uploads the package. The title and
      summary then update from the package manifest.
   9. In the dashboard, add the rename announcement below to the reviewer notes,
      then submit for review. Check the draft's package-sourced title reads
      `Snug: Bookmark Export, Import & Backup`.
   10. After publication, compare analytics against
       [`baseline-2026-09.md`](baseline-2026-09.md).
3. **Rename announcement.** From `copy.md` section 2. Use it in the reviewer
   notes and in any user communication.

   English:

   ```text
   This extension has a new name: Snug. Same extension, same local-only promise — export, import, and scheduled backups for your bookmarks, with nothing ever sent anywhere. Nothing about your data or settings changes; only the name and the icon do.
   ```

   Spanish:

   ```text
   Esta extensión tiene un nuevo nombre: Snug. La misma extensión, la misma promesa de siempre: exportar, importar y respaldar tus marcadores según el horario que configures, sin enviar nada a ningún lado. Tus datos y tu configuración no cambian — solo el nombre y el ícono.
   ```
