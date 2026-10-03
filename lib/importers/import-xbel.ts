import { i18n } from '#i18n'

import { classifyRootTitle } from '@/lib/importers/import-html'
import type { ResolvedImportRootTitles } from '@/lib/importers/resolve-roots'
import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'
import type { ParsedBookmark } from '@/lib/types'

/**
 * A parsed XBEL document. `hasLocationData` is true only when the file's
 * top-level folders name the bookmarks bar, Other bookmarks or Mobile
 * bookmarks; otherwise everything lands in Other bookmarks and Restore modes
 * make no sense.
 */
export interface ParsedXBEL {
  tree: ParsedBookmark[]
  hasLocationData: boolean
}

function isValidXBEL(content: string): boolean {
  if (!/<xbel[\s>]/i.test(content)) return false
  const document = new DOMParser().parseFromString(content, 'application/xml')
  return (
    document.querySelector('parsererror') === null &&
    document.documentElement.localName === 'xbel'
  )
}

function parseDate(element: Element): number {
  const parsed = Date.parse(element.getAttribute('added') ?? '')
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function parseEntries(parent: Element): ParsedBookmark[] {
  const entries: ParsedBookmark[] = []
  for (const element of parent.children) {
    const title =
      [...element.children]
        .find((child) => child.localName === 'title')
        ?.textContent?.trim() ?? ''
    if (element.localName === 'folder') {
      entries.push({
        title,
        dateAdded: parseDate(element),
        children: parseEntries(element),
      })
    } else if (element.localName === 'bookmark') {
      const href = element.getAttribute('href') ?? undefined
      entries.push({
        title,
        url: isAllowedBookmarkUrl(href) ? href : undefined,
        dateAdded: parseDate(element),
      })
    }
  }
  return entries
}

/**
 * Parses an XBEL document into the normalized root tree the importers write.
 * Top-level folders titled like the bookmarks bar, Other bookmarks or Mobile
 * bookmarks (as Snug's own XBEL export writes them) map to those roots; every
 * other top-level folder or bookmark lands in Other bookmarks. Disallowed
 * addresses leave `url` undefined so the writer counts them as skipped.
 * @param text The XBEL document.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns The `[ bar?, other?, mobile? ]` root nodes and whether the file
 *   carried location data.
 * @throws {Error} When `text` is not well-formed XML with an `xbel` root.
 */
export function parseXBEL(
  text: string,
  liveRootTitles?: ResolvedImportRootTitles,
): ParsedXBEL {
  if (!isValidXBEL(text)) throw new Error('Invalid XBEL document')
  const document = new DOMParser().parseFromString(text, 'application/xml')
  const buckets = {
    bar: [] as ParsedBookmark[],
    other: [] as ParsedBookmark[],
    mobile: [] as ParsedBookmark[],
  }
  let hasLocationData = false

  for (const entry of parseEntries(document.documentElement)) {
    const role = entry.children
      ? classifyRootTitle(entry.title, liveRootTitles)
      : undefined
    if (role) {
      hasLocationData = true
      buckets[role].push(...(entry.children ?? []))
    } else {
      buckets.other.push(entry)
    }
  }

  const tree: ParsedBookmark[] = []
  const now = Date.now()
  if (buckets.bar.length > 0) {
    tree.push({
      title: i18n.t('bookmarksBar'),
      dateAdded: now,
      children: buckets.bar,
      isBookmarksBar: true,
    })
  }
  if (hasLocationData || buckets.other.length > 0) {
    tree.push({
      title: i18n.t('otherBookmarks'),
      dateAdded: now,
      children: buckets.other,
      isOtherBookmarks: true,
    })
  }
  if (buckets.mobile.length > 0) {
    tree.push({
      title: i18n.t('mobileBookmarks'),
      dateAdded: now,
      children: buckets.mobile,
      isMobileBookmarks: true,
    })
  }
  return { tree, hasLocationData }
}
