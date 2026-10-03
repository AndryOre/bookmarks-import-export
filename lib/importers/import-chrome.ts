import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'
import { parseJsonOnce } from '@/lib/parse-json-once'
import type { ParsedBookmark } from '@/lib/types'

interface ChromeNode {
  name?: unknown
  type?: unknown
  url?: unknown
  date_added?: unknown
  date_modified?: unknown
  children?: unknown
}

const WEBKIT_EPOCH_OFFSET_MILLISECONDS = 11_644_473_600_000

/**
 * Checks whether parsed JSON is a raw Chrome profile `Bookmarks` file: an
 * object whose `roots` holds a `bookmark_bar` or `other` folder object.
 * @param value The result of `JSON.parse` on the file content.
 * @returns Whether `value` has the Chrome profile `Bookmarks` shape.
 */
export function isChromeBookmarksFile(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const roots = (value as { roots?: unknown }).roots
  if (typeof roots !== 'object' || roots === null) return false
  const { bookmark_bar: bar, other } = roots as Record<string, unknown>
  return (
    (typeof bar === 'object' && bar !== null) ||
    (typeof other === 'object' && other !== null)
  )
}

function toUnixMilliseconds(value: unknown): number {
  const microseconds = Number(value)
  return !Number.isFinite(microseconds) || microseconds <= 0
    ? Date.now()
    : Math.round(microseconds / 1000 - WEBKIT_EPOCH_OFFSET_MILLISECONDS)
}

function convertNode(node: ChromeNode): ParsedBookmark {
  const title = typeof node.name === 'string' ? node.name : ''
  const dateAdded = toUnixMilliseconds(node.date_added)
  if (Array.isArray(node.children)) {
    return {
      title,
      dateAdded,
      dateGroupModified: toUnixMilliseconds(node.date_modified),
      children: node.children.map((child) => convertNode(child as ChromeNode)),
    }
  }
  const url = typeof node.url === 'string' ? node.url : undefined
  return {
    title,
    url: isAllowedBookmarkUrl(url) ? url : undefined,
    dateAdded,
  }
}

/**
 * Parses a raw Chrome profile `Bookmarks` file into the normalized root
 * tree the importers write: `bookmark_bar` becomes the bookmarks bar,
 * `other` becomes Other bookmarks and `synced` becomes Mobile bookmarks.
 * Roots missing from the file are omitted. Chrome timestamps (microseconds
 * since 1601) are converted to Unix milliseconds.
 * @param text The raw file content.
 * @returns The `[ bar?, other?, mobile? ]` root nodes.
 * @throws {Error} When `text` is not JSON.
 */
export function parseChromeBookmarks(text: string): ParsedBookmark[] {
  const roots = (parseJsonOnce(text) as { roots?: Record<string, ChromeNode> })
    .roots
  const result: ParsedBookmark[] = []
  const mappings = [
    ['bookmark_bar', 'isBookmarksBar'],
    ['other', 'isOtherBookmarks'],
    ['synced', 'isMobileBookmarks'],
  ] as const

  for (const [key, flag] of mappings) {
    const root = roots?.[key]
    if (typeof root !== 'object' || root === null) continue
    const converted = convertNode({ ...root, children: root.children ?? [] })
    result.push({ ...converted, [flag]: true })
  }
  return result
}
