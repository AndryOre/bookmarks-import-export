import { countBookmarks } from '@/lib/count-bookmarks'
import { ExportCanceledError, type ExportControl } from '@/lib/export-control'
import { EXPORT_FORMAT_INFO, type ExportFormat } from '@/lib/export-formats'
import { formatFilenameTemplate } from '@/lib/filename-template'
import { renderExport } from '@/lib/render-export'
import {
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
} from '@/lib/storage'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

interface ExportAllResult {
  fileName: string
  count: number
}

async function buildContent(
  format: ExportFormat,
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

  return renderExport(format, {
    ...control,
    selectedBookmarks,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  })
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
  format: ExportFormat,
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null,
  control: ExportControl = {},
): Promise<ExportAllResult> {
  const content = await buildContent(format, selectedBookmarks, control)
  if (control.signal?.aborted) throw new ExportCanceledError()
  const baseName = formatFilenameTemplate(
    await exportFilenameTemplateStore.getValue(),
  )
  const { extension, mimeType } = EXPORT_FORMAT_INFO[format]
  const fileName = `${baseName}.${extension}`
  triggerDownload(content, mimeType, fileName)

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
  format: ExportFormat,
  control: ExportControl = {},
): Promise<ExportAllResult> {
  return exportBookmarks(format, null, control)
}
