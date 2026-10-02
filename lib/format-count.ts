const formatterCache = new Map<string, Intl.NumberFormat>()

/**
 * Formats a count for display with `Intl.NumberFormat`, so digit grouping and
 * numerals follow the user's locale instead of `Number#toString()`.
 * @param value The count to format.
 * @param locale A BCP 47 tag; defaults to the runtime locale.
 * @returns The localized number string, e.g. `12,345` in `en`.
 */
export function formatCount(value: number, locale?: string): string {
  const cacheKey = locale ?? ''
  let formatter = formatterCache.get(cacheKey)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale)
    formatterCache.set(cacheKey, formatter)
  }
  return formatter.format(value)
}
