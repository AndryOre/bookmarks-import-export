import Papa from 'papaparse'

import { isChromeBookmarksFile } from '@/lib/importers/import-chrome'
import { isSafariExport } from '@/lib/importers/import-safari'
import { parseJsonOnce } from '@/lib/parse-json-once'
import type { BookmarkFormat } from '@/lib/types'

type KnownFormat = 'json' | 'csv' | 'html' | 'xbel'

const FORMAT_BY_MIME: Record<string, KnownFormat> = {
  'application/json': 'json',
  'text/csv': 'csv',
  'text/html': 'html',
  'application/xml': 'xbel',
  'text/xml': 'xbel',
  'application/x-xbel': 'xbel',
}

const FORMAT_BY_EXTENSION: Record<string, KnownFormat> = {
  json: 'json',
  csv: 'csv',
  html: 'html',
  htm: 'html',
  xbel: 'xbel',
  xml: 'xbel',
}

const SNIFF_ORDER: readonly KnownFormat[] = ['html', 'xbel', 'json', 'csv']

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
  if (fromMime) {
    return isValidFor(fromMime, content)
      ? refineFormat(fromMime, content)
      : 'unknown'
  }

  const dotIndex = fileName.lastIndexOf('.')
  const extension = dotIndex === -1 ? '' : fileName.slice(dotIndex + 1)
  const fromExtension = FORMAT_BY_EXTENSION[extension.toLowerCase()]
  const candidates = fromExtension
    ? [fromExtension, ...SNIFF_ORDER]
    : SNIFF_ORDER

  const detected = candidates.find((format) =>
    isSniffable(format, content, fromExtension),
  )
  return detected ? refineFormat(detected, content) : 'unknown'
}

/**
 * Narrows a validated generic format to a source-specific one: JSON that has
 * the Chrome profile `roots` shape is `'chrome'`, and Netscape HTML that has
 * Safari's Favorites / Reading List folders is `'safari'`.
 * @param format The validated generic format.
 * @param content The raw file content.
 * @returns The specific format, or `format` unchanged.
 */
function refineFormat(format: KnownFormat, content: string): BookmarkFormat {
  if (format === 'json' && isChromeBookmarksFile(parseJsonOnce(content))) {
    return 'chrome'
  }
  return format === 'html' && isSafariExport(content) ? 'safari' : format
}

const VALIDATORS: Record<KnownFormat, (content: string) => boolean> = {
  json: isValidJSON,
  csv: isValidCSV,
  html: isValidHTML,
  xbel: isValidXBEL,
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

function skipWhitespace(content: string, from: number): number {
  let index = from
  while (index < content.length && /\s/.test(content.charAt(index))) index++
  return index
}

function skipXBELProlog(content: string): number {
  let index = skipWhitespace(content, 0)
  if (content.startsWith('<?xml', index)) {
    const end = content.indexOf('?>', index)
    if (end === -1) return -1
    index = skipWhitespace(content, end + 2)
  }
  let hasDoctype = false
  for (;;) {
    if (content.startsWith('<!--', index)) {
      const end = content.indexOf('-->', index + 4)
      if (end === -1) return -1
      index = skipWhitespace(content, end + 3)
    } else if (
      !hasDoctype &&
      content.slice(index, index + 9).toUpperCase() === '<!DOCTYPE'
    ) {
      const end = content.indexOf('>', index)
      if (end === -1) return -1
      hasDoctype = true
      index = skipWhitespace(content, end + 1)
    } else {
      return index
    }
  }
}

/**
 * Checks that the document element is `xbel`. Full XML validation is left to
 * the parser, so detection also works where `DOMParser` is unavailable. The
 * prolog is skipped with a linear scan rather than a regular expression, so
 * hostile comment runs cannot cause backtracking.
 * @param content The raw file content to validate.
 * @returns Whether `content` starts like an XBEL document.
 */
function isValidXBEL(content: string): boolean {
  const index = skipXBELProlog(content)
  return index !== -1 && /^<xbel[\s>]/i.test(content.slice(index, index + 6))
}

function isValidJSON(content: string): boolean {
  try {
    parseJsonOnce(content)
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
  return /^<!doctype netscape-bookmark-file-1>/i.test(content.trimStart())
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

  const hasFatalError = result.errors.some(
    (error) => error.type !== 'FieldMismatch',
  )
  if (hasFatalError || result.data.length === 0) return false

  const fields = new Set(
    (result.meta.fields ?? []).map((field) => field.toLowerCase().trim()),
  )
  const hasTitle = fields.has('title')
  const hasUrl = fields.has('url')

  return hasTitle && hasUrl
}
