import { EXPORT_FORMATS, type ExportFormat } from '@/lib/export-formats'

/**
 * Normalizes a formats selection coming from the Auto-export page's
 * multi-select toggle group. The last selected format can never be turned
 * off, so an empty selection keeps the previous one.
 * @param next The formats the toggle group reports after a change.
 * @param previous The currently persisted formats.
 * @returns The formats to persist, in canonical order.
 */
export function resolveFormats(
  next: ExportFormat[],
  previous: ExportFormat[],
): ExportFormat[] {
  const chosen = next.length === 0 ? previous : next
  return EXPORT_FORMATS.filter((format) => chosen.includes(format))
}

/**
 * Normalizes the folder typed on the Auto-export page: trimmed, and a blank
 * value falls back to the previously persisted folder.
 * @param typed The raw text in the folder field.
 * @param previous The currently persisted folder.
 * @returns The folder to persist.
 */
export function resolveFolder(typed: string, previous: string): string {
  const trimmed = typed.trim()
  return trimmed === '' ? previous : trimmed
}

/**
 * Parses the "Keep the last N runs" field on the Auto-export page. Only a
 * whole number of at least 0 is valid.
 * @param typed The raw text in the retention field.
 * @returns The parsed count, or `null` when the text is not a valid integer >= 0.
 */
export function parseKeepLast(typed: string): number | null {
  const trimmed = typed.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}
