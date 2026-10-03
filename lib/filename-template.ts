import { sanitizePathSegment } from '@/lib/path-segment'

/**
 * Supported filename template tokens, paired with the function that
 * resolves each to its value for a given date. Matching is case-insensitive
 * (the `i` flag) since `formatFilenameTemplate` runs these patterns
 * directly against user input. Order matters: `%yyyy` must precede `%yy`,
 * and `%min`/`%sec` must precede any pattern that could match a prefix of
 * them, so a longer token is never partially consumed by a shorter one.
 * @param d The date to resolve the matched token against.
 * @returns The token's resolved value for `d`.
 */
const PLACEHOLDERS: [RegExp, (d: Date) => string][] = [
  [/%yyyy/gi, (d) => String(d.getFullYear())],
  [/%yy/gi, (d) => String(d.getFullYear()).slice(-2)],
  [/%mm/gi, (d) => String(d.getMonth() + 1).padStart(2, '0')],
  [/%dd/gi, (d) => String(d.getDate()).padStart(2, '0')],
  [/%hh/gi, (d) => String(d.getHours()).padStart(2, '0')],
  [/%min/gi, (d) => String(d.getMinutes()).padStart(2, '0')],
  [/%sec/gi, (d) => String(d.getSeconds()).padStart(2, '0')],
]

/**
 * Expands a user-supplied filename template into a filesystem-safe
 * filename by substituting each `%token` in {@link PLACEHOLDERS} with its
 * value for `date`, then sanitizing the result: characters illegal on major
 * filesystems (`/\:*?"<>|`) become `_`, runs of whitespace collapse to a
 * single space, and the ends are trimmed. If the template contains no
 * tokens and resolves to an empty string, falls back to `"Bookmarks"` so a
 * blank or whitespace-only template never produces an unusable filename —
 * this fallback does not apply when sanitization alone produces a non-empty
 * result (e.g. an all-illegal-character template becomes underscores, not
 * the fallback).
 * @param template The user-supplied filename template.
 * @param date The date each `%token` resolves against.
 * @returns The sanitized, non-empty filename.
 */
export function formatFilenameTemplate(
  template: string,
  date = new Date(),
): string {
  let result = template
  for (const [pattern, resolver] of PLACEHOLDERS) {
    result = result.replace(pattern, () => resolver(date))
  }

  result = sanitizePathSegment(
    result.replaceAll(/[/\\:*?"<>|]/g, '_').replaceAll(/\s+/g, ' '),
  )

  return result || 'Bookmarks'
}
