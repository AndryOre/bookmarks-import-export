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

export const ALARM_NAME = 'auto-export'

const INTERVAL_MINUTES: Record<AutoExportInterval, number> = {
  '12h': 720,
  '1d': 1440,
  '3d': 4320,
  '7d': 10080,
}

export function getNextExportDate(
  interval: AutoExportInterval,
  preferredTime: string,
): Date {
  const now = new Date()

  if (interval === '12h') {
    return new Date(now.getTime() + 12 * 60 * 60 * 1000)
  }

  const [hours, minutes] = preferredTime.split(':').map(Number)
  const days = interval === '1d' ? 1 : interval === '3d' ? 3 : 7

  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  if (next <= now) {
    next.setDate(next.getDate() + days)
  }

  return next
}

export async function syncAlarm(): Promise<void> {
  const config = await autoExportConfigStore.getValue()
  await browser.alarms.clear(ALARM_NAME)

  if (!config.enabled || config.formats.length === 0) return

  const nextDate = getNextExportDate(config.interval, config.preferredTime)
  const delayInMinutes = Math.max(
    0.1,
    (nextDate.getTime() - Date.now()) / 60000,
  )

  await browser.alarms.create(ALARM_NAME, {
    delayInMinutes,
    periodInMinutes: INTERVAL_MINUTES[config.interval],
  })
}

function sanitizePath(path: string): string {
  return path
    .replace(/^\/+/, '')
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .trim()
}

function toDataUrl(content: string, mimeType: string): string {
  const bytes = new TextEncoder().encode(content)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

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
