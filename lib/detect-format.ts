import Papa from 'papaparse'

import type { BookmarkFormat } from '@/lib/types'

/**
 * Detects which bookmark format `content` is in, based on `mimeType` alone —
 * never on the source file's extension. Each MIME type is additionally
 * validated against the content itself before it's trusted: JSON must parse,
 * HTML must carry the Netscape bookmarks DOCTYPE, and CSV must have `title`
 * and `url` header columns within its first 3 rows. Any other MIME type, or a
 * MIME type whose content fails validation, is reported as `'unknown'`.
 * @param content The raw file content to detect a format for.
 * @param mimeType The file's declared MIME type.
 * @returns The detected format, or `'unknown'` if it can't be determined.
 */
export function detectFormat(
  content: string,
  mimeType: string,
): BookmarkFormat {
  const type = mimeType.toLowerCase()

  switch (type) {
    case 'application/json': {
      return isValidJSON(content) ? 'json' : 'unknown'
    }
    case 'text/csv': {
      return isValidCSV(content) ? 'csv' : 'unknown'
    }
    case 'text/html': {
      return isValidHTML(content) ? 'html' : 'unknown'
    }
    default: {
      return 'unknown'
    }
  }
}

function isValidJSON(content: string): boolean {
  try {
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

/**
 * Checks for the Netscape-format bookmarks file DOCTYPE, which every
 * browser's HTML bookmark export starts with.
 * @param content The raw file content to validate.
 * @returns Whether `content` looks like a Netscape bookmarks HTML file.
 */
function isValidHTML(content: string): boolean {
  return content.trimStart().startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
}

/**
 * Parses only the first 3 rows (`preview: 3`) and checks that a `title` and a
 * `url` header column are both present, case-insensitively.
 * @param content The raw file content to validate.
 * @returns Whether `content` looks like a CSV bookmarks export.
 */
function isValidCSV(content: string): boolean {
  const result = Papa.parse(content.trim(), {
    header: true,
    skipEmptyLines: true,
    preview: 3,
  })

  if (result.errors.length > 0 || result.data.length === 0) return false

  const fields = (result.meta.fields ?? []).map((f) => f.toLowerCase())
  const hasTitle = fields.some((f) => f.includes('title'))
  const hasUrl = fields.some((f) => f.includes('url'))

  return hasTitle && hasUrl
}
