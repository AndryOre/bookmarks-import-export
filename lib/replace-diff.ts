import { countBookmarks } from '@/lib/count-bookmarks'
import { resolveImportRoots } from '@/lib/importers/resolve-roots'
import type { ImportPreview } from '@/lib/types'

/**
 * What a Restore-replace of a given file would change: how many bookmarks
 * the replace deletes from the current tree, and how many the file adds.
 */
export interface ReplaceDiff {
  removedCount: number
  addedCount: number
}

/**
 * Computes the effect of a Restore-replace from the current bookmarks tree
 * and the file's preview. The bookmarks bar and Other bookmarks are always
 * cleared; the Mobile root is cleared only when the file carries Mobile
 * bookmarks, matching the importers. When the file carries both a local and
 * an account set of a root, every live root of that type is cleared too.
 * @param preview The preview of the file about to be restored.
 * @returns The removed and added bookmark counts.
 */
export async function getReplaceDiff(
  preview: ImportPreview,
): Promise<ReplaceDiff> {
  const [treeRoot] = await browser.bookmarks.getTree()
  const rootChildren = treeRoot?.children ?? []
  const { bookmarksBarId, otherBookmarksId, mobileId } =
    resolveImportRoots(rootChildren)
  const clearedIds = new Set([bookmarksBarId, otherBookmarksId])
  if (preview.clearsMobileRoot) clearedIds.add(mobileId)

  const splitRootTypes = new Set<string>(preview.splitRootTypes)
  if (!preview.clearsMobileRoot) splitRootTypes.delete('mobile')
  for (const node of rootChildren) {
    if (splitRootTypes.has(node.folderType ?? '')) clearedIds.add(node.id)
  }

  const clearedRoots = rootChildren.filter((node) => clearedIds.has(node.id))
  return {
    removedCount: countBookmarks(clearedRoots),
    addedCount: preview.totalCount,
  }
}
