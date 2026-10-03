import { countImportableBookmarks } from './count-bookmarks'
import { detectFormat } from './detect-format'
import { parseCSVTree } from './importers/import-csv'
import { shouldClearMobileRoot } from './importers/mobile-root'
import { parseLocationAwareImport } from './importers/parse-import'
import {
  findSplitRootTypes,
  type ResolvedImportRootTitles,
} from './importers/resolve-roots'
import type { ImportPreview, ParsedBookmark } from './types'

/**
 * Builds a summary of what importing `text` would do, without importing
 * anything. Never throws: a detection or parse failure falls through to a
 * zeroed preview with `format` set to whatever {@link detectFormat} returned
 * (typically `'unknown'`). CSV previews never carry location data — folder
 * paths aren't tied to the bookmarks bar or other bookmarks, so
 * `hasLocationData` is always `false` for the `'csv'` format.
 * @param text The raw file content to preview.
 * @param mimeType The file's MIME type, used to help detect its format.
 * @param fileName The file's name, a fallback hint when the MIME type fails.
 * @param liveRootTitles The current browser's own root titles, used to
 * recognize its root folders in files without explicit root markers.
 * @returns A summary of the import this content would produce.
 */
export function getImportPreview(
  text: string,
  mimeType: string,
  fileName?: string,
  liveRootTitles?: ResolvedImportRootTitles,
): ImportPreview {
  const format = detectFormat(text, mimeType, fileName)

  try {
    const parsed = parseLocationAwareImport(text, format, liveRootTitles)
    if (parsed) {
      const countRootChildren = (
        isRoot: (node: ParsedBookmark) => boolean | undefined,
      ) => {
        let total = 0
        for (const node of parsed.tree) {
          if (isRoot(node)) {
            total += countImportableBookmarks(node.children ?? [])
          }
        }
        return total
      }
      const bookmarksBarCount = countRootChildren((n) => n.isBookmarksBar)
      const otherBookmarksCount = countRootChildren((n) => n.isOtherBookmarks)
      const mobileBookmarksCount = countRootChildren((n) => n.isMobileBookmarks)
      const splitRootTypes = findSplitRootTypes(parsed.tree)
      return {
        format,
        bookmarksBarCount,
        otherBookmarksCount,
        mobileBookmarksCount,
        ...(splitRootTypes.length > 0 && { splitRootTypes }),
        clearsMobileRoot: parsed.tree.some(
          (n) => n.isMobileBookmarks && shouldClearMobileRoot(n),
        ),
        totalCount:
          bookmarksBarCount + otherBookmarksCount + mobileBookmarksCount,
        hasLocationData: parsed.hasLocationData,
      }
    }

    if (format === 'csv') {
      const count = countImportableBookmarks(parseCSVTree(text).tree)
      return {
        format,
        bookmarksBarCount: 0,
        otherBookmarksCount: 0,
        mobileBookmarksCount: 0,
        clearsMobileRoot: false,
        totalCount: count,
        hasLocationData: false,
      }
    }
  } catch {}

  return {
    format,
    bookmarksBarCount: 0,
    otherBookmarksCount: 0,
    mobileBookmarksCount: 0,
    clearsMobileRoot: false,
    totalCount: 0,
    hasLocationData: false,
  }
}
