import Papa from 'papaparse'

import { detectFormat } from './detect-format'
import { processCSVData } from './importers/import-csv'
import { parseLocationAwareImport } from './importers/parse-import'
import { isAllowedBookmarkUrl } from './importers/url-validation'
import { collectExistingUrls, dropDuplicateBookmarks } from './skip-duplicates'
import type { ParsedBookmark } from './types'

/**
 * What Skip duplicates would do to an import file.
 */
export interface ImportDuplicateSummary {
  skippedDuplicates: number
  importableCount: number
}

function parseImportTree(
  text: string,
  mimeType: string,
  fileName?: string,
): ParsedBookmark[] {
  const format = detectFormat(text, mimeType, fileName)
  const parsed = parseLocationAwareImport(text, format)
  if (parsed) return parsed.tree
  if (format === 'csv') {
    const parsed = Papa.parse<Record<string, string>>(text.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
    })
    return processCSVData(parsed.data).tree
  }
  return []
}

function countAllowedBookmarks(nodes: ParsedBookmark[]): number {
  let total = 0
  for (const node of nodes) {
    if (isAllowedBookmarkUrl(node.url)) total++
    total += countAllowedBookmarks(node.children ?? [])
  }
  return total
}

/**
 * Previews Skip duplicates for an import file against the live bookmarks tree
 * using the same filter the importers apply, so `importableCount` equals the
 * number of bookmarks that will actually be created. Never throws: an
 * unreadable file yields zeros.
 * @param text The raw file content.
 * @param mimeType The file's MIME type.
 * @param fileName The file's name, a fallback format hint.
 * @returns How many bookmarks would be skipped and how many would be created.
 */
export async function summarizeImportDuplicates(
  text: string,
  mimeType: string,
  fileName?: string,
): Promise<ImportDuplicateSummary> {
  try {
    const tree = parseImportTree(text, mimeType, fileName)
    const liveTree = await browser.bookmarks.getTree()
    const { nodes, skippedDuplicates } = dropDuplicateBookmarks(
      tree,
      collectExistingUrls(liveTree),
    )
    return { skippedDuplicates, importableCount: countAllowedBookmarks(nodes) }
  } catch {
    return { skippedDuplicates: 0, importableCount: 0 }
  }
}
