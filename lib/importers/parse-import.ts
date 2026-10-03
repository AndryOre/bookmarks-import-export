import { parseChromeBookmarks } from '@/lib/importers/import-chrome'
import { parseHTML } from '@/lib/importers/import-html'
import {
  normalizeJsonRoot,
  preprocessBookmarks,
} from '@/lib/importers/import-json'
import { parseSafari } from '@/lib/importers/import-safari'
import { parseXBEL } from '@/lib/importers/import-xbel'
import type { ResolvedImportRootTitles } from '@/lib/importers/resolve-roots'
import type { BookmarkFormat, ParsedBookmark } from '@/lib/types'

/**
 * A parsed import file: the normalized root tree and whether it carries
 * location data (a bookmarks bar, Other or Mobile root), which decides if the
 * Restore modes are offered.
 */
export interface ParsedImport {
  tree: ParsedBookmark[]
  hasLocationData: boolean
}

function withRootDetection(tree: ParsedBookmark[]): ParsedImport {
  return {
    tree,
    hasLocationData: tree.some(
      (node) =>
        node.isBookmarksBar || node.isOtherBookmarks || node.isMobileBookmarks,
    ),
  }
}

/**
 * Parses the location-aware formats (HTML, JSON, Chrome `Bookmarks`, XBEL and
 * Safari) into a normalized root tree without writing anything. The single
 * place the preview, the duplicate summary and the importers agree on the
 * tree for a given format.
 * @param text The raw file content.
 * @param format The detected format.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns The parsed tree, or `undefined` for formats without location data
 *   (CSV, unknown).
 * @throws {Error} When the content is malformed for its format.
 */
export function parseLocationAwareImport(
  text: string,
  format: BookmarkFormat,
  liveRootTitles?: ResolvedImportRootTitles,
): ParsedImport | undefined {
  switch (format) {
    case 'html': {
      return withRootDetection(parseHTML(text, liveRootTitles))
    }
    case 'json': {
      const roots = normalizeJsonRoot(JSON.parse(text))
      return withRootDetection(preprocessBookmarks(roots))
    }
    case 'chrome': {
      return withRootDetection(parseChromeBookmarks(text))
    }
    case 'safari': {
      return withRootDetection(parseSafari(text, liveRootTitles))
    }
    case 'xbel': {
      return parseXBEL(text, liveRootTitles)
    }
    default: {
      return undefined
    }
  }
}
