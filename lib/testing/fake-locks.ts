interface LockOptions {
  ifAvailable?: boolean
}

type LockCallback = (lock: object | null) => unknown

/**
 * Installs a minimal in-memory `navigator.locks` (exclusive locks with the
 * `ifAvailable` option) for tests, since neither Node nor jsdom provides one.
 * Idempotent; held locks are shared across the whole test file's module state.
 */
export function installFakeLocks(): void {
  const held = new Set<string>()
  const locks = {
    async request(
      name: string,
      options: LockOptions | LockCallback,
      callback?: LockCallback,
    ): Promise<unknown> {
      const resolvedOptions = typeof options === 'function' ? {} : options
      const resolvedCallback =
        typeof options === 'function' ? options : callback
      if (!resolvedCallback) throw new TypeError('Missing lock callback')
      if (held.has(name)) {
        if (resolvedOptions.ifAvailable) return resolvedCallback(null)
        throw new Error('Waiting for a held lock is not supported by the fake')
      }
      held.add(name)
      try {
        return await resolvedCallback({ name })
      } finally {
        held.delete(name)
      }
    },
  }
  Object.defineProperty(globalThis.navigator, 'locks', {
    value: locks,
    configurable: true,
  })
}
