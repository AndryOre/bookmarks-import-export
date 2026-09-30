/**
 * Schemes a bookmark URL is allowed to use. Excludes `javascript:`, `data:`,
 * `file:`, and browser-internal schemes like `chrome:` — `new URL()` alone
 * parses all of these without throwing, so it can't be relied on by itself
 * to reject them.
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'ftp:'])

/**
 * Validates `url` as a bookmark target: it must be `new URL()`-parseable
 * and use an allowed scheme. Used as a type guard by every importer (CSV,
 * HTML, JSON) so untrusted input never reaches `browser.bookmarks.create`
 * with an unsafe scheme.
 * @param url The URL to validate, possibly `undefined`.
 * @returns Whether `url` is a non-empty, allowed-scheme URL.
 */
export function isAllowedBookmarkUrl(url: string | undefined): url is string {
  if (!url) return false

  try {
    return ALLOWED_SCHEMES.has(new URL(url).protocol)
  } catch {
    return false
  }
}
