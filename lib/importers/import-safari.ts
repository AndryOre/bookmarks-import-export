import { parseHTML } from '@/lib/importers/import-html'
import type { ResolvedImportRootTitles } from '@/lib/importers/resolve-roots'
import type { ParsedBookmark } from '@/lib/types'

const SAFARI_FOLDER_PATTERN =
  /<h3[^>]*>\s*(?:Favorites|BookmarksBar|Reading List)\s*<\/h3>/i
const SAFARI_FAVORITES_TITLES = new Set(['favorites', 'bookmarksbar'])

/**
 * Checks whether a Netscape bookmarks HTML export came from Safari: it has a
 * top-level Favorites or Reading List folder and, unlike Chrome, Edge and
 * Firefox exports, no bookmarks-bar marker attribute.
 * @param html The raw Netscape-format HTML.
 * @returns Whether `html` looks like a Safari export.
 */
export function isSafariExport(html: string): boolean {
  return (
    SAFARI_FOLDER_PATTERN.test(html) && !/personal_toolbar_folder/i.test(html)
  )
}

/**
 * Parses a Safari bookmarks HTML export. The Favorites folder becomes the
 * bookmarks bar; Reading List and every other top-level folder or bookmark
 * stay in Other bookmarks, so Reading List is imported into its own folder.
 * @param html The Safari Netscape-format HTML export.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns The `[ bar?, other?, mobile? ]` root nodes.
 */
export function parseSafari(
  html: string,
  liveRootTitles?: ResolvedImportRootTitles,
): ParsedBookmark[] {
  const parsed = parseHTML(html, liveRootTitles)
  const other = parsed.find((node) => node.isOtherBookmarks)
  const favorites = other?.children?.find(
    (child) =>
      child.children && SAFARI_FAVORITES_TITLES.has(child.title.toLowerCase()),
  )
  if (!other || !favorites) return parsed

  const remaining = (other.children ?? []).filter(
    (child) => child !== favorites,
  )
  const result: ParsedBookmark[] = [{ ...favorites, isBookmarksBar: true }]
  if (remaining.length > 0) result.push({ ...other, children: remaining })
  result.push(...parsed.filter((node) => node !== other))
  return result
}
