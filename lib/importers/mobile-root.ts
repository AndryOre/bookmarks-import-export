import type { ParsedBookmark } from '@/lib/types'

/**
 * Whether a restore-replace import clears the browser's Mobile root: true when
 * the file's Mobile node carries any child at all, folders included. The one
 * place this rule lives, shared by the importers and the replace diff so the
 * preview counts exactly what the import deletes.
 * @param mobileNode The file's Mobile bookmarks node.
 * @returns Whether the import empties the live Mobile root.
 */
export function shouldClearMobileRoot(mobileNode: ParsedBookmark): boolean {
  return (mobileNode.children?.length ?? 0) > 0
}
