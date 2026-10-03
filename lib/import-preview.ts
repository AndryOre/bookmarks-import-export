import Papa from 'papaparse'

import { detectFormat } from './detect-format'
import { parseLocationAwareImport } from './importers/parse-import'
import type { ResolvedImportRootTitles } from './importers/resolve-roots'
import type { ImportPreview, ParsedBookmark } from './types'

function countBookmarks(nodes: ParsedBookmark[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.url) {
      count += 1
    } else if (node.children) {
      count += countBookmarks(node.children)
    }
  }
  return count
}

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
      const barNode = parsed.tree.find((n) => n.isBookmarksBar)
      const otherNode = parsed.tree.find((n) => n.isOtherBookmarks)
      const mobileNode = parsed.tree.find((n) => n.isMobileBookmarks)
      const bookmarksBarCount = countBookmarks(barNode?.children ?? [])
      const otherBookmarksCount = countBookmarks(otherNode?.children ?? [])
      const mobileBookmarksCount = countBookmarks(mobileNode?.children ?? [])
      return {
        format,
        bookmarksBarCount,
        otherBookmarksCount,
        mobileBookmarksCount,
        totalCount:
          bookmarksBarCount + otherBookmarksCount + mobileBookmarksCount,
        hasLocationData: parsed.hasLocationData,
      }
    }

    if (format === 'csv') {
      const csv = Papa.parse<Record<string, string>>(text.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim(),
      })
      let count = 0
      for (const row of csv.data) {
        const title = row['title']?.trim()
        const url = row['url']?.trim()
        if (!title || !url) continue
        try {
          new URL(url)
          count++
        } catch {}
      }
      return {
        format,
        bookmarksBarCount: 0,
        otherBookmarksCount: 0,
        mobileBookmarksCount: 0,
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
    totalCount: 0,
    hasLocationData: false,
  }
}
