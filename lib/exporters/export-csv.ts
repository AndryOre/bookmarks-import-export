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

/**
Exports bookmarks as CSV text: CRLF line endings, every field quoted, and
one column per requested field (`title`, `url`, `folder`, plus `dateAdded`,
`dateLastUsed`, `iconData` when their options are enabled). Timestamps are
converted from the milliseconds Chrome stores to whole seconds. Nested
folders are flattened into a single `folder` column, with path segments
joined by `/`.
*/
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

/**
Recursively walks `nodes`, pushing one row per bookmark onto `rows`. Folders
contribute no row of their own; their label is appended to `parentPath`
(joined with `/`) and passed down to their children.
*/
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
Computes the label to use for a folder in the CSV `folder` column. The root
(id `"0"`) always contributes an empty label; the bookmarks bar (`"1"`) and
other bookmarks (`"2"`) use their localized names. Regular folders return an
empty label when `shouldHideParentFolder` is set, which flattens every level
of nesting under them.
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
