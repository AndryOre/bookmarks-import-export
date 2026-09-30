import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { formatFilenameTemplate } from '@/lib/filename-template'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
} from '@/lib/storage'
import type { AutoExportInterval } from '@/lib/types'

/**
 * Name of the `browser.alarms` alarm that triggers {@link runAutoExport}.
 */
export const ALARM_NAME = 'auto-export'

const INTERVAL_MINUTES: Record<AutoExportInterval, number> = {
  '12h': 720,
  '1d': 1440,
  '3d': 4320,
  '7d': 10_080,
}

/**
 * Computes the next auto-export run time for a given interval. The `12h`
 * interval fires every 12 hours from now, ignoring `preferredTime` — it's
 * frequent enough that a user-chosen time of day wouldn't be meaningful. The
 * daily/multi-day intervals instead target `preferredTime` on the current or
 * next eligible day, advancing by the interval's day count whenever that
 * time has already passed today.
 */
function getNextExportDate(
  interval: AutoExportInterval,
  preferredTime: string,
): Date {
  const now = new Date()

  if (interval === '12h') {
    return new Date(now.getTime() + 12 * 60 * 60 * 1000)
  }

  const [hoursRaw, minutesRaw] = preferredTime.split(':').map(Number)
  const hours = hoursRaw ?? 0
  const minutes = minutesRaw ?? 0
  const days = interval === '1d' ? 1 : interval === '3d' ? 3 : 7

  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  if (next <= now) {
    next.setDate(next.getDate() + days)
  }

  return next
}

/**
 * Clears any existing `auto-export` alarm and, if auto-export is enabled
 * with at least one format selected, recreates it for the next run computed
 * by {@link getNextExportDate}. Always clearing first (rather than only
 * updating) keeps a stale alarm from firing after the user disables
 * auto-export or deselects every format. `delayInMinutes` is floored at
 * `0.1` because `browser.alarms.create` rejects a delay of `0` or less, which
 * a `nextDate` in the past — or equal to `Date.now()` — would otherwise
 * produce.
 */
export async function syncAlarm(): Promise<void> {
  const config = await autoExportConfigStore.getValue()
  await browser.alarms.clear(ALARM_NAME)

  if (!config.enabled || config.formats.length === 0) return

  const nextDate = getNextExportDate(config.interval, config.preferredTime)
  const delayInMinutes = Math.max(
    0.1,
    (nextDate.getTime() - Date.now()) / 60_000,
  )

  await browser.alarms.create(ALARM_NAME, {
    delayInMinutes,
    periodInMinutes: INTERVAL_MINUTES[config.interval],
  })
}

/**
 * Sanitises the user-configured auto-export output path before it's used as
 * a `browser.downloads.download` filename prefix: strips a leading `/` (the
 * path is relative to the browser's downloads folder, not absolute), removes
 * `..` segments to prevent escaping that folder, and collapses repeated
 * slashes.
 */
function sanitizePath(path: string): string {
  return path
    .replace(/^\/+/, '')
    .replaceAll('..', '')
    .replaceAll(/\/+/g, '/')
    .trim()
}

/**
 * Encodes export content as a base64 data URL. `browser.downloads.download`
 * needs a URL, and a service worker (unlike a page context) has no `URL`
 * object with `createObjectURL`, so a data URL is the only way to hand it
 * in-memory content directly.
 */
function toDataUrl(content: string, mimeType: string): string {
  const bytes = new TextEncoder().encode(content)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte)
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

/**
 * Runs a scheduled auto-export: reads the current export settings, generates
 * each selected format, and downloads it to the configured folder. Skips
 * entirely if auto-export is disabled or no format is selected — this can
 * happen if the alarm fires from stale state just before {@link syncAlarm}
 * clears it. Each download uses `saveAs: false` (no save-dialog prompt) and
 * `conflictAction: 'uniquify'` so a repeat run never silently overwrites a
 * previous export. The CSV branch passes a narrower options object than
 * HTML/JSON because `exportToCSV` has no `hideOtherBookmarks` or
 * `includeDateGroupModified` support — the user's "hide Other Bookmarks" and
 * "group by modified date" preferences are silently ignored for CSV output.
 * {@link autoExportLastRunStore} is updated only after every selected
 * download has completed.
 */
export async function runAutoExport(): Promise<void> {
  const config = await autoExportConfigStore.getValue()
  if (!config.enabled || config.formats.length === 0) return

  const [
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
    filenameTemplate,
  ] = await Promise.all([
    includeIconDataStore.getValue(),
    includeDateAddedStore.getValue(),
    includeDateLastUsedStore.getValue(),
    includeDateGroupModifiedStore.getValue(),
    hideOtherBookmarksStore.getValue(),
    hideParentFolderStore.getValue(),
    exportFilenameTemplateStore.getValue(),
  ])

  const baseOptions = {
    selectedBookmarks: null,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  }

  const baseName = formatFilenameTemplate(filenameTemplate)
  const sanitized = sanitizePath(config.path)
  const prefix = sanitized
    ? `${sanitized}${sanitized.endsWith('/') ? '' : '/'}`
    : ''

  const downloads: Promise<void>[] = []

  if (config.formats.includes('html')) {
    downloads.push(
      (async () => {
        const content = await exportToHTML(baseOptions)
        await browser.downloads.download({
          url: toDataUrl(content, 'text/html'),
          filename: `${prefix}${baseName}.html`,
          saveAs: false,
          conflictAction: 'uniquify',
        })
      })(),
    )
  }

  if (config.formats.includes('json')) {
    downloads.push(
      (async () => {
        const data = await exportToJSON(baseOptions)
        await browser.downloads.download({
          url: toDataUrl(JSON.stringify(data, null, 2), 'application/json'),
          filename: `${prefix}${baseName}.json`,
          saveAs: false,
          conflictAction: 'uniquify',
        })
      })(),
    )
  }

  if (config.formats.includes('csv')) {
    downloads.push(
      (async () => {
        const content = await exportToCSV({
          selectedBookmarks: null,
          includeIconData,
          includeDateAdded,
          includeDateLastUsed,
          hideParentFolder,
        })
        await browser.downloads.download({
          url: toDataUrl(content, 'text/csv'),
          filename: `${prefix}${baseName}.csv`,
          saveAs: false,
          conflictAction: 'uniquify',
        })
      })(),
    )
  }

  await Promise.all(downloads)
  await autoExportLastRunStore.setValue(Date.now())
}
