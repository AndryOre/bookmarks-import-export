import { countBookmarks } from '@/lib/count-bookmarks'
import {
  createExportTicker,
  type ExportControl,
  type ExportTicker,
} from '@/lib/export-control'
import { getFaviconBase64 } from '@/lib/favicon'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

import { isBookmarksBar, isOtherBookmarks } from './root-folders'

interface ExportJSONOptions extends ExportControl {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null
  includeIconData: boolean
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  includeDateGroupModified: boolean
  hideOtherBookmarks: boolean
  hideParentFolder: boolean
}

type NodeOptions = Omit<
  ExportJSONOptions,
  'selectedBookmarks' | keyof ExportControl
> & { ticker: ExportTicker }

const toSeconds = (ms: number): number => Math.floor(ms / 1000)

/**
 * Exports bookmarks as a single-element array wrapping an `id="0"` root node,
 * so the output round-trips through `importFromJSON` (which expects that same
 * root-wrapped shape) without losing the root. Timestamps are converted from
 * the milliseconds Chrome stores to whole seconds.
 * @param options Which bookmarks to export and which optional fields to include.
 * @returns The single-element array wrapping the exported root node.
 */
export async function exportToJSON(
  options: ExportJSONOptions,
): Promise<ExtendedBookmarkTreeNode[]> {
  const {
    selectedBookmarks,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  } = options

  const rootNodes = await browser.bookmarks.getTree()
  const rootNode = rootNodes[0] as ExtendedBookmarkTreeNode
  const nodesToExport = selectedBookmarks ?? rootNode.children ?? []

  const ticker = createExportTicker(
    options,
    countBookmarks(nodesToExport as ExtendedBookmarkTreeNode[]),
  )
  const options_: NodeOptions = {
    ticker,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  }

  const processedChildren = await processNodes(
    nodesToExport as ExtendedBookmarkTreeNode[],
    options_,
  )

  ticker.finish()

  const root: ExtendedBookmarkTreeNode = {
    ...rootNode,
    children: processedChildren,
  }
  delete root.url
  delete root.parentId
  delete root.index
  delete root.dateLastUsed
  delete root.iconData
  if (root.dateAdded) root.dateAdded = toSeconds(root.dateAdded)
  if (!includeDateAdded) delete root.dateAdded
  if (root.dateGroupModified)
    root.dateGroupModified = toSeconds(root.dateGroupModified)
  if (!includeDateGroupModified) delete root.dateGroupModified

  return [root]
}

/**
 * Whether a node is the Mobile or Managed bookmarks root. Those roots must
 * survive `hideParentFolder` as folders, otherwise their children land
 * unclassified at the top level of the export and the importer cannot tell
 * where they belong.
 * @param node The node to test.
 * @returns `true` for a Mobile or Managed root.
 */
function isPreservedRoot(node: ExtendedBookmarkTreeNode): boolean {
  return (
    node.folderType === 'mobile' ||
    node.folderType === 'managed' ||
    node.id === '3'
  )
}

/**
 * Processes each of `nodes` via {@link processNode} and flattens the results
 * into a single array.
 * @param nodes The nodes to process.
 * @param options Which optional fields and folder-hiding behavior to apply.
 * @returns The processed nodes, flattened into a single array.
 */
async function processNodes(
  nodes: ExtendedBookmarkTreeNode[],
  options: NodeOptions,
): Promise<ExtendedBookmarkTreeNode[]> {
  const result: ExtendedBookmarkTreeNode[] = []
  for (const node of nodes) {
    const processed = await processNode(node, options)
    result.push(...processed)
  }
  return result
}

/**
 * Processes a single node into zero or one output nodes: a bookmark is
 * returned as-is (with timestamps converted and optional fields applied); a
 * folder is returned with its children processed recursively, unless it is
 * "other bookmarks" (id `"2"`) with `hideOtherBookmarks` set, or a regular
 * folder with `hideParentFolder` set — in which case the folder itself is
 * dropped and its children are spliced directly into the parent's output.
 * @param node The node to process.
 * @param options Which optional fields and folder-hiding behavior to apply.
 * @returns Zero or one processed nodes, depending on folder-hiding rules.
 */
async function processNode(
  node: ExtendedBookmarkTreeNode,
  options: NodeOptions,
): Promise<ExtendedBookmarkTreeNode[]> {
  if (node.url) {
    options.ticker.tick()
    const processed: ExtendedBookmarkTreeNode = { ...node }

    if (processed.dateAdded)
      processed.dateAdded = toSeconds(processed.dateAdded)
    if (!options.includeDateAdded) delete processed.dateAdded

    if (processed.dateLastUsed)
      processed.dateLastUsed = toSeconds(processed.dateLastUsed)
    if (!options.includeDateLastUsed) delete processed.dateLastUsed

    if (options.includeIconData) {
      processed.iconData = await getFaviconBase64(node.url)
    }

    return [processed]
  }
  if (node.children !== undefined) {
    if (isOtherBookmarks(node) && options.hideOtherBookmarks) {
      return processNodes(node.children as ExtendedBookmarkTreeNode[], options)
    }

    if (
      options.hideParentFolder &&
      node.id !== '0' &&
      !isBookmarksBar(node) &&
      !isOtherBookmarks(node) &&
      !isPreservedRoot(node)
    ) {
      return processNodes(node.children as ExtendedBookmarkTreeNode[], options)
    }

    const processedChildren = await processNodes(
      node.children as ExtendedBookmarkTreeNode[],
      options,
    )

    const folder: ExtendedBookmarkTreeNode = {
      ...node,
      children: processedChildren,
    }
    delete folder.url
    delete folder.parentId
    delete folder.index
    delete folder.dateLastUsed
    delete folder.iconData

    if (folder.dateAdded) folder.dateAdded = toSeconds(folder.dateAdded)
    if (!options.includeDateAdded) delete folder.dateAdded

    if (folder.dateGroupModified)
      folder.dateGroupModified = toSeconds(folder.dateGroupModified)
    if (!options.includeDateGroupModified) delete folder.dateGroupModified

    return [folder]
  }

  return []
}
