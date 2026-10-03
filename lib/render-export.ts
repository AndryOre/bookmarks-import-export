import type { ExportControl } from '@/lib/export-control'
import type { ExportFormat } from '@/lib/export-formats'
import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { exportToMarkdown } from '@/lib/exporters/export-markdown'
import { exportToOPML } from '@/lib/exporters/export-opml'
import { exportToXBEL } from '@/lib/exporters/export-xbel'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

/**
 * The persisted export options plus the selection and the progress/abort
 * control, as every exporter needs them.
 */
export interface RenderExportOptions extends ExportControl {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null
  includeIconData: boolean
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  includeDateGroupModified: boolean
  hideOtherBookmarks: boolean
  hideParentFolder: boolean
}

/**
 * Renders the bookmarks as file text in the given format. Each exporter takes
 * only the options that make sense for it (CSV ignores the folder-hiding and
 * group-modified options; Markdown, OPML and XBEL ignore icon data).
 * @param format The format to render.
 * @param options The selection, export options and progress/abort control.
 * @returns The file text.
 * @throws {ExportCanceledError} When `options.signal` aborts.
 */
export async function renderExport(
  format: ExportFormat,
  options: RenderExportOptions,
): Promise<string> {
  switch (format) {
    case 'html': {
      return exportToHTML(options)
    }
    case 'json': {
      return JSON.stringify(await exportToJSON(options), null, 2)
    }
    case 'csv': {
      return exportToCSV(options)
    }
    case 'markdown': {
      return exportToMarkdown(options)
    }
    case 'opml': {
      return exportToOPML(options)
    }
    case 'xbel': {
      return exportToXBEL(options)
    }
  }
}
