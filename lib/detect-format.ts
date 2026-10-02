import Papa from 'papaparse'

import type { BookmarkFormat } from '@/lib/types'

type KnownFormat = Exclude<BookmarkFormat, 'unknown'>

const FORMAT_BY_MIME: Record<string, KnownFormat> = {
  'application/json': 'json',
  'text/csv': 'csv',
  'text/html': 'html',
}

const FORMAT_BY_EXTENSION: Record<string, KnownFormat> = {
  json: 'json',
  csv: 'csv',
  html: 'html',
  htm: 'html',
}

const SNIFF_ORDER: readonly KnownFormat[] = ['html', 'json', 'csv']

/**
 * Detects which bookmark format `content` is in. A recognized MIME type
 * (JSON, CSV or HTML) is authoritative and never overridden by the file name.
 * When the MIME type is empty or unrecognized, the file extension is tried
 * next, and finally the content itself is sniffed. Every candidate is
 * validated against the content: JSON must parse, HTML must carry the
 * Netscape bookmarks DOCTYPE, and CSV must have `title` and `url` header
 * columns within its first 3 rows.
 * @param content The raw file content to detect a format for.
 * @param mimeType The file's declared MIME type, possibly empty.
 * @param fileName The file's name, used as a fallback hint.
 * @returns The detected format, or `'unknown'` if it can't be determined.
 */
export function detectFormat(
  content: string,
  mimeType: string,
  fileName = '',
): BookmarkFormat {
  const fromMime = FORMAT_BY_MIME[mimeType.toLowerCase()]
  if (fromMime) return isValidFor(fromMime, content) ? fromMime : 'unknown'

  const dotIndex = fileName.lastIndexOf('.')
  const extension = dotIndex === -1 ? '' : fileName.slice(dotIndex + 1)
  const fromExtension = FORMAT_BY_EXTENSION[extension.toLowerCase()]
  const candidates = fromExtension
    ? [fromExtension, ...SNIFF_ORDER]
    : SNIFF_ORDER

  return (
    candidates.find((format) => isSniffable(format, content, fromExtension)) ??
    'unknown'
  )
}

const VALIDATORS: Record<KnownFormat, (content: string) => boolean> = {
  json: isValidJSON,
  csv: isValidCSV,
  html: isValidHTML,
}

function isValidFor(format: KnownFormat, content: string): boolean {
  return VALIDATORS[format](content)
}

function isSniffable(
  format: KnownFormat,
  content: string,
  extensionFormat?: KnownFormat,
): boolean {
  const isScalarJSON =
    format === 'json' &&
    format !== extensionFormat &&
    !/^[[{]/.test(content.trimStart())
  return !isScalarJSON && isValidFor(format, content)
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
