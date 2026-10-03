const cache: { text?: string; value?: unknown } = {}

/**
 * Parses `text` as JSON, remembering the last successful parse so detection,
 * preview, duplicate summary and import of the same picked file share one
 * `JSON.parse`. Callers must treat the returned value as read-only. A failed
 * parse is not remembered and throws each time, like `JSON.parse`.
 * @param text The raw JSON content.
 * @returns The parsed value.
 * @throws {SyntaxError} When `text` is not valid JSON.
 */
export function parseJsonOnce(text: string): unknown {
  if (cache.text === text) return cache.value
  const value: unknown = JSON.parse(text)
  cache.text = text
  cache.value = value
  return value
}
