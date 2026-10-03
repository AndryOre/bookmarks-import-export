import { countBookmarks } from '@/lib/count-bookmarks'
import { ExportCanceledError, type ExportControl } from '@/lib/export-control'
import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { formatFilenameTemplate } from '@/lib/filename-template'
import {
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
} from '@/lib/storage'
import type { AutoExportFormat, ExtendedBookmarkTreeNode } from '@/lib/types'

interface ExportAllResult {
  fileName: string
  count: number
}

const MIME_TYPES: Record<AutoExportFormat, string> = {
  html: 'text/html',
  json: 'application/json',
  csv: 'text/csv',
}

async function buildContent(
  format: AutoExportFormat,
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null,
  control: ExportControl,
): Promise<string> {
  const [
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  ] = await Promise.all([
    includeIconDataStore.getValue(),
    includeDateAddedStore.getValue(),
    includeDateLastUsedStore.getValue(),
    includeDateGroupModifiedStore.getValue(),
    hideOtherBookmarksStore.getValue(),
    hideParentFolderStore.getValue(),
  ])

  const baseOptions = {
    ...control,
    selectedBookmarks,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  }

  switch (format) {
    case 'html': {
      return exportToHTML(baseOptions)
    }
    case 'json': {
      return JSON.stringify(await exportToJSON(baseOptions), null, 2)
    }
    case 'csv': {
      return exportToCSV({
        ...control,
        selectedBookmarks,
        includeIconData,
        includeDateAdded,
        includeDateLastUsed,
        hideParentFolder,
      })
    }
  }
}

function triggerDownload(
  content: string,
  mimeType: string,
  fileName: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Exports the given selection (or, with `null`, every bookmark) in the given
 * format using the persisted export options and filename template, and saves
 * it through a browser download.
 * @param format The format to export.
 * @param selectedBookmarks The pruned selection to export, or `null` for the whole tree.
 * @param control Progress callback and abort signal.
 * @returns The saved file name and the number of bookmarks exported.
 * @throws {ExportCanceledError} When `control.signal` aborts; no file is
 *   downloaded.
 */
export async function exportBookmarks(
  format: AutoExportFormat,
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null,
  control: ExportControl = {},
): Promise<ExportAllResult> {
  const content = await buildContent(format, selectedBookmarks, control)
  if (control.signal?.aborted) throw new ExportCanceledError()
  const baseName = formatFilenameTemplate(
    await exportFilenameTemplateStore.getValue(),
  )
  const fileName = `${baseName}.${format}`
  triggerDownload(content, MIME_TYPES[format], fileName)

  const tree = selectedBookmarks ?? (await browser.bookmarks.getTree())
  return { fileName, count: countBookmarks(tree) }
}

/**
 * Exports every bookmark in the given format using the persisted export
 * options and filename template, and saves it through a browser download.
 * @param format The format to export.
 * @param control Progress callback and abort signal.
 * @returns The saved file name and the number of bookmarks in the browser.
 */
export function exportAllBookmarks(
  format: AutoExportFormat,
  control: ExportControl = {},
): Promise<ExportAllResult> {
  return exportBookmarks(format, null, control)
}
