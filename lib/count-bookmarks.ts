import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'

interface CountableNode {
  url?: string
  children?: CountableNode[]
}

/**
 * Counts the bookmarks (nodes with a URL) in a bookmark tree, ignoring
 * folders.
 * @param nodes The tree nodes to walk recursively.
 * @returns The number of bookmark nodes.
 */
export function countBookmarks(nodes: CountableNode[]): number {
  let total = 0
  for (const node of nodes) {
    if (node.url !== undefined) total += 1
    if (node.children) total += countBookmarks(node.children)
  }
  return total
}

/**
 * Counts the bookmarks an importer would actually write: nodes whose URL
 * passes `isAllowedBookmarkUrl`, ignoring folders and nodes with an
 * unsupported address.
 * @param nodes The parsed tree nodes to walk recursively.
 * @returns The number of writable bookmark nodes.
 */
export function countImportableBookmarks(nodes: CountableNode[]): number {
  let total = 0
  for (const node of nodes) {
    if (isAllowedBookmarkUrl(node.url)) total += 1
    if (node.children) total += countImportableBookmarks(node.children)
  }
  return total
}
