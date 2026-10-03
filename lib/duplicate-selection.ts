import type { DuplicateGroup } from './duplicates'

/**
 * Maps each group's normalized URL to the id of the copy the user keeps.
 */
export type KeptCopyIds = Record<string, string>

/**
 * @param group A Duplicate group, copies ordered oldest first.
 * @param keptCopyIds The user's explicit choices; a missing entry keeps the
 *   oldest modifiable copy, or the oldest copy when none is modifiable.
 * @returns The id of the copy to keep in that group.
 */
export function getKeptCopyId(
  group: DuplicateGroup,
  keptCopyIds: KeptCopyIds,
): string {
  const chosen = keptCopyIds[group.normalizedUrl]
  const isStillPresent = group.copies.some((copy) => copy.id === chosen)
  if (isStillPresent && chosen !== undefined) return chosen
  const defaultCopy =
    group.copies.find((copy) => !copy.unmodifiable) ?? group.copies[0]
  return defaultCopy.id
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
      .filter((copy) => copy.id !== keptId && !copy.unmodifiable)
      .map((copy) => copy.id)
  })
}

/**
 * Restricts the ids the user reviewed to those a fresh scan still marks
 * Delete, so a copy added after the review is never removed.
 * @param reviewedIds The ids shown to the user in the confirm dialog.
 * @param freshGroups Groups from a scan taken at confirm time.
 * @param keptCopyIds The user's explicit choices per group.
 * @returns The reviewed ids that are still safe to delete.
 */
export function getReviewedIdsStillToDelete(
  reviewedIds: string[],
  freshGroups: DuplicateGroup[],
  keptCopyIds: KeptCopyIds,
): string[] {
  const freshIds = new Set(getCopyIdsToDelete(freshGroups, keptCopyIds))
  return reviewedIds.filter((id) => freshIds.has(id))
}

/**
 * Outcome of {@link deleteBookmarksById}.
 */
export interface DeleteBookmarksResult {
  deleted: number
  failed: number
}

/**
 * Removes bookmarks one by one with `bookmarks.remove`, which refuses
 * non-empty folders, so folders can never be deleted by this path. A failing
 * removal is counted and the rest still run.
 * @param ids The bookmark ids to remove.
 * @returns How many bookmarks were removed and how many failed.
 */
export async function deleteBookmarksById(
  ids: string[],
): Promise<DeleteBookmarksResult> {
  let deleted = 0
  let failed = 0
  for (const id of ids) {
    try {
      await browser.bookmarks.remove(id)
      deleted += 1
    } catch {
      failed += 1
    }
  }
  return { deleted, failed }
}
