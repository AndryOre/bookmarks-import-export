import Papa from 'papaparse'

import { detectFormat } from './detect-format'
import { parseHTML } from './importers/import-html'
import { preprocessBookmarks } from './importers/import-json'
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
 * @returns A summary of the import this content would produce.
 */
export function getImportPreview(
  text: string,
  mimeType: string,
): ImportPreview {
  const format = detectFormat(text, mimeType)

  try {
    if (format === 'html') {
      const parsed = parseHTML(text)
      const barNode = parsed.find((n) => n.isBookmarksBar)
      const otherNode = parsed.find((n) => n.isOtherBookmarks)
      const mobileNode = parsed.find((n) => n.isMobileBookmarks)
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
        hasLocationData: !!(barNode || otherNode || mobileNode),
      }
    }

    if (format === 'json') {
      const raw = JSON.parse(text)
      const data: ParsedBookmark[] = Array.isArray(raw) ? raw : [raw]
      const preprocessed = preprocessBookmarks(data)
      const barNode = preprocessed.find((n) => n.isBookmarksBar)
      const otherNode = preprocessed.find((n) => n.isOtherBookmarks)
      const mobileNode = preprocessed.find((n) => n.isMobileBookmarks)
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
        hasLocationData: !!(barNode || otherNode || mobileNode),
      }
    }

    if (format === 'csv') {
      const parsed = Papa.parse<Record<string, string>>(text.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim(),
      })
      let count = 0
      for (const row of parsed.data) {
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
