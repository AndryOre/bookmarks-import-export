import { i18n } from '#i18n'
import Papa from 'papaparse'

import { getFaviconBase64 } from '@/lib/favicon'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

interface ExportCSVOptions {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null
  includeIconData: boolean
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  hideParentFolder: boolean
}

interface CSVRow {
  title: string
  url: string
  folder: string
  dateAdded?: number
  dateLastUsed?: number
  iconData?: string
}

export async function exportToCSV(options: ExportCSVOptions): Promise<string> {
  const {
    selectedBookmarks,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    hideParentFolder,
  } = options

  const rootNodes = await browser.bookmarks.getTree()
  const rootNode = rootNodes[0]
  const nodesToExport = selectedBookmarks ?? rootNode?.children ?? []

  const rows: CSVRow[] = []

  await flattenToRows(nodesToExport as ExtendedBookmarkTreeNode[], rows, '', {
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    hideParentFolder,
  })

  const fields: string[] = ['title', 'url', 'folder']
  if (includeDateAdded) fields.push('dateAdded')
  if (includeDateLastUsed) fields.push('dateLastUsed')
  if (includeIconData) fields.push('iconData')

  return Papa.unparse(rows, {
    quotes: true,
    delimiter: ',',
    newline: '\r\n',
    header: true,
    columns: fields,
  })
}

// ── Aplanado recursivo ────────────────────────────────────────────────────────

async function flattenToRows(
  nodes: ExtendedBookmarkTreeNode[],
  rows: CSVRow[],
  parentPath: string,
  options: Omit<ExportCSVOptions, 'selectedBookmarks'>,
): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      const row: CSVRow = {
        title: node.title,
        url: node.url,
        folder: parentPath,
      }

      if (options.includeDateAdded) {
        row.dateAdded = node.dateAdded
          ? Math.floor(node.dateAdded / 1000)
          : undefined
      }

      if (options.includeDateLastUsed) {
        row.dateLastUsed = node.dateLastUsed
          ? Math.floor(node.dateLastUsed / 1000)
          : undefined
      }

      if (options.includeIconData) {
        row.iconData = await getFaviconBase64(node.url)
      }

      rows.push(row)
    } else if (node.children) {
      const folderLabel = getFolderLabel(node, options.hideParentFolder)
      const childPath = parentPath
        ? folderLabel
          ? `${parentPath}/${folderLabel}`
          : parentPath
        : folderLabel

      await flattenToRows(
        node.children as ExtendedBookmarkTreeNode[],
        rows,
        childPath,
        options,
      )
    }
  }
}

/**
 * Calcula el label de una carpeta para el campo `folder` del CSV.
 * id="0" siempre vacío; id="1"/"2" usan claves i18n.
 * Carpetas normales retornan "" si hideParentFolder=true (aplana todos los niveles).
 */
function getFolderLabel(
  node: ExtendedBookmarkTreeNode,
  shouldHideParentFolder: boolean,
): string {
  if (node.id === '0') return ''
  if (node.id === '1') return i18n.t('bookmarksBar')
  if (node.id === '2') return i18n.t('otherBookmarks')
  return shouldHideParentFolder ? '' : node.title
}
