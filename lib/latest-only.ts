/**
 * Outcome of a {@link createLatestOnly} call: the loaded value while the call
 * is still the most recent one, or a bare stale marker once a newer call has
 * started.
 */
export type LatestOnlyResult<Value> =
  { isCurrent: true; value: Value } | { isCurrent: false }

/**
 * Wraps an async loader so only the most recent call counts. Every call bumps
 * a shared token; when an older call settles after a newer one started it is
 * reported as stale (and its error is dropped), so callers never apply an
 * out-of-date result over a newer one.
 * @param load The async work to guard.
 * @returns A function that runs `load` and reports whether it is still current.
 */
export function createLatestOnly<Input, Value>(
  load: (input: Input) => Promise<Value>,
): (input: Input) => Promise<LatestOnlyResult<Value>> {
  let latestToken = 0
  return async (input) => {
    latestToken += 1
    const token = latestToken
    try {
      const value = await load(input)
      return token === latestToken
        ? { isCurrent: true, value }
        : { isCurrent: false }
    } catch (error) {
      if (token !== latestToken) return { isCurrent: false }
      throw error
    }
  }
}
