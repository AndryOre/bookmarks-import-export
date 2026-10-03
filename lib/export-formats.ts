/**
 * Every format Snug can export to, in the order the format selectors list
 * them. Deliberately separate from the import-side `BookmarkFormat`: the
 * Markdown, OPML and XBEL exporters have no matching importer here, and the
 * import side has an `unknown` value that never makes sense for export.
 */
export const EXPORT_FORMATS = [
  'html',
  'json',
  'csv',
  'markdown',
  'opml',
  'xbel',
] as const

export type ExportFormat = (typeof EXPORT_FORMATS)[number]

/**
 * How many formats the popup's toggle group can show before it switches to a
 * Select.
 */
export const POPUP_TOGGLE_FORMAT_LIMIT = 3

interface ExportFormatInfo {
  label: string
  extension: string
  mimeType: string
}

/**
 * Display label (never translated), file extension (without the dot) and MIME
 * type of each export format.
 */
export const EXPORT_FORMAT_INFO: Record<ExportFormat, ExportFormatInfo> = {
  html: { label: 'HTML', extension: 'html', mimeType: 'text/html' },
  json: { label: 'JSON', extension: 'json', mimeType: 'application/json' },
  csv: { label: 'CSV', extension: 'csv', mimeType: 'text/csv' },
  markdown: { label: 'Markdown', extension: 'md', mimeType: 'text/markdown' },
  opml: { label: 'OPML', extension: 'opml', mimeType: 'text/x-opml+xml' },
  xbel: { label: 'XBEL', extension: 'xbel', mimeType: 'application/xml' },
}
