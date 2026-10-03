const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i

/**
 * Makes one path segment acceptable to `browser.downloads.download`, which
 * rejects segments Chromium considers unsafe on any platform: it trims
 * surrounding whitespace, strips leading dots and trailing dots/spaces, and
 * prefixes Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`,
 * `COM1-9`, `LPT1-9`, with or without an extension) with `_`.
 * @param segment A single path segment, without `/`.
 * @returns The cleaned segment, or an empty string if nothing is left (which
 * also covers `.` and `..`).
 */
export function sanitizePathSegment(segment: string): string {
  const cleaned = segment
    .trim()
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
    .trim()
  if (!cleaned) return ''
  return WINDOWS_RESERVED_NAME.test(cleaned) ? `_${cleaned}` : cleaned
}
