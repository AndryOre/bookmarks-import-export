import { countBookmarks } from '@/lib/count-bookmarks'
import { createExportTicker, type ExportControl } from '@/lib/export-control'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

import { isBookmarksBar, isOtherBookmarks } from './root-folders'

/**
 * Options for the structural exporters (Markdown, OPML, XBEL), which keep the
 * folder tree and titles and ignore icon data.
 */
export interface TreeExportOptions extends ExportControl {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  includeDateGroupModified: boolean
  hideOtherBookmarks: boolean
  hideParentFolder: boolean
}

/**
 * A bookmark or folder ready to be rendered by a structural exporter. Dates
 * are milliseconds since the epoch and only present when the matching export
 * option is enabled.
 */
export type ExportNode =
  | {
      kind: 'bookmark'
      title: string
      url: string
      dateAdded?: number
      dateLastUsed?: number
    }
  | {
      kind: 'folder'
      title: string
      dateAdded?: number
      dateGroupModified?: number
      children: ExportNode[]
    }

/**
 * Walks the bookmarks to export and builds the node tree the structural
 * exporters render, applying `hideOtherBookmarks` and `hideParentFolder` (a
 * hidden folder's children are lifted into its parent) and reporting
 * progress per bookmark.
 * @param options Which bookmarks to export and which dates and folders to keep.
 * @returns The top-level nodes in tree order.
 * @throws {ExportCanceledError} When `options.signal` aborts.
 */
export async function buildExportTree(
  options: TreeExportOptions,
): Promise<ExportNode[]> {
  const rootNodes = await browser.bookmarks.getTree()
  const nodes = (options.selectedBookmarks ??
    rootNodes[0]?.children ??
    []) as ExtendedBookmarkTreeNode[]
  const ticker = createExportTicker(options, countBookmarks(nodes))

  const convert = (list: ExtendedBookmarkTreeNode[]): ExportNode[] => {
    const result: ExportNode[] = []
    for (const node of list) {
      if (node.url) {
        ticker.tick()
        result.push({
          kind: 'bookmark',
          title: node.title,
          url: node.url,
          ...(options.includeDateAdded &&
            node.dateAdded && { dateAdded: node.dateAdded }),
          ...(options.includeDateLastUsed &&
            node.dateLastUsed && { dateLastUsed: node.dateLastUsed }),
        })
      } else if (node.children) {
        const children = convert(node.children as ExtendedBookmarkTreeNode[])
        const isHidden =
          (isOtherBookmarks(node) && options.hideOtherBookmarks) ||
          (options.hideParentFolder &&
            node.id !== '0' &&
            !isBookmarksBar(node) &&
            !isOtherBookmarks(node))
        if (isHidden) {
          result.push(...children)
        } else {
          result.push({
            kind: 'folder',
            title: node.title,
            ...(options.includeDateAdded &&
              node.dateAdded && { dateAdded: node.dateAdded }),
            ...(options.includeDateGroupModified &&
              node.dateGroupModified && {
                dateGroupModified: node.dateGroupModified,
              }),
            children,
          })
        }
      }
    }
    return result
  }

  const tree = convert(nodes)
  ticker.finish()
  return tree
}

/**
 * Escapes text for XML element content or a double-quoted attribute, and
 * drops characters XML 1.0 cannot carry (most control characters).
 * @param text The raw text.
 * @returns Text safe to embed in an XML document.
 */
export function escapeXml(text: string): string {
  return text

    .replaceAll(/[\u{0}-\u{8}\u{B}\u{C}\u{E}-\u{1F}\u{FFFE}\u{FFFF}]/gu, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
