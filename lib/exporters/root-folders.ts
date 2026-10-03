import type { ExtendedBookmarkTreeNode } from '@/lib/types'

type RootCandidate = Pick<ExtendedBookmarkTreeNode, 'id' | 'folderType'>

/**
 * Whether a node is the bookmarks bar. Matches the browser's `folderType`
 * marker (which also covers account-stored bookmark roots with other ids) or
 * the legacy fixed id `'1'`.
 * @param node The node to test.
 * @returns `true` for a bookmarks bar root.
 */
export function isBookmarksBar(node: RootCandidate): boolean {
  return node.folderType === 'bookmarks-bar' || node.id === '1'
}

/**
 * Whether a node is "Other bookmarks". Matches the browser's `folderType`
 * marker (which also covers account-stored bookmark roots with other ids) or
 * the legacy fixed id `'2'`.
 * @param node The node to test.
 * @returns `true` for an Other bookmarks root.
 */
export function isOtherBookmarks(node: RootCandidate): boolean {
  return node.folderType === 'other' || node.id === '2'
}
