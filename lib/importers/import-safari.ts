import { parseHTML } from '@/lib/importers/import-html'
import type { ResolvedImportRootTitles } from '@/lib/importers/resolve-roots'
import type { ParsedBookmark } from '@/lib/types'

const SAFARI_FOLDER_PATTERN =
  /<h3[^>]*>\s*(?:Favorites|BookmarksBar|Reading List)\s*<\/h3>/i
const DL_AND_H3_PATTERN = /<(\/?)dl\b[^>]*>|<h3[^>]*>([\s\S]*?)<\/h3>/gi
const SAFARI_FAVORITES_TITLES = new Set(['favorites', 'bookmarksbar'])

function listTopLevelFolderTitles(html: string): string[] {
  const titles: string[] = []
  let depth = 0
  for (const match of html.matchAll(DL_AND_H3_PATTERN)) {
    if (match[2] === undefined) {
      depth += match[1] ? -1 : 1
    } else if (depth === 1) {
      titles.push(match[2].trim().toLowerCase())
    }
  }
  return titles
}

function hasSafariSignal(html: string): boolean {
  const titles = listTopLevelFolderTitles(html)
  return (
    titles.includes('reading list') ||
    (titles[0] !== undefined && SAFARI_FAVORITES_TITLES.has(titles[0]))
  )
}

/**
 * Checks whether a Netscape bookmarks HTML export came from Safari: it has a
 * top-level Favorites or Reading List folder and, unlike Chrome, Edge and
 * Firefox exports, no bookmarks-bar marker attribute. A Favorites folder only
 * counts when it is the first top-level folder or a top-level Reading List is
 * also present, so IE, Diigo and Raindrop exports are not mistaken for Safari.
 * @param html The raw Netscape-format HTML.
 * @returns Whether `html` looks like a Safari export.
 */
export function isSafariExport(html: string): boolean {
  return (
    SAFARI_FOLDER_PATTERN.test(html) &&
    !/personal_toolbar_folder/i.test(html) &&
    hasSafariSignal(html)
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
