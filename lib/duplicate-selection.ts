import type { DuplicateGroup } from './duplicates'

/**
 * Maps each group's normalized URL to the id of the copy the user keeps.
 */
export type KeptCopyIds = Record<string, string>

/**
 * @param group A Duplicate group, copies ordered oldest first.
 * @param keptCopyIds The user's explicit choices; a missing entry keeps the
 *   oldest copy.
 * @returns The id of the copy to keep in that group.
 */
export function getKeptCopyId(
  group: DuplicateGroup,
  keptCopyIds: KeptCopyIds,
): string {
  const chosen = keptCopyIds[group.normalizedUrl]
  const isStillPresent = group.copies.some((copy) => copy.id === chosen)
  return isStillPresent && chosen !== undefined ? chosen : group.copies[0].id
}

/**
 * @param groups The Duplicate groups currently listed.
 * @param keptCopyIds The user's explicit choices per group.
 * @returns The ids of every copy marked Delete, bookmarks only.
 */
export function getCopyIdsToDelete(
  groups: DuplicateGroup[],
  keptCopyIds: KeptCopyIds,
): string[] {
  return groups.flatMap((group) => {
    const keptId = getKeptCopyId(group, keptCopyIds)
    return group.copies
      .filter((copy) => copy.id !== keptId)
      .map((copy) => copy.id)
  })
}

/**
 * Removes bookmarks one by one with `bookmarks.remove`, which refuses
 * non-empty folders, so folders can never be deleted by this path.
 * @param ids The bookmark ids to remove.
 * @returns The number of bookmarks removed.
 */
export async function deleteBookmarksById(ids: string[]): Promise<number> {
  for (const id of ids) {
    await browser.bookmarks.remove(id)
  }
  return ids.length
}
