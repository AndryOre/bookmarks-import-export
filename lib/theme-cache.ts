export type Theme = 'dark' | 'light' | 'system'

/**
 * `localStorage` key mirroring `themeStore`. WXT storage is async, so this
 * synchronous copy lets the theme be applied before the first paint.
 */
export const THEME_CACHE_KEY = 'snug:theme'

function isTheme(value: unknown): value is Theme {
  return (
    typeof value === 'string' && ['dark', 'light', 'system'].includes(value)
  )
}

/**
 * Reads the synchronous theme cache.
 * @returns The cached theme, or `undefined` when it is missing, corrupt or
 * storage is blocked.
 */
export function readCachedTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem(THEME_CACHE_KEY)
    return isTheme(value) ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * Mirrors the theme into the synchronous cache. Blocked storage is ignored:
 * the cache is only an optimization over the real storage item.
 * @param theme The theme to cache.
 */
export function writeCachedTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme)
  } catch {
    return
  }
}

/**
 * Sets the `light` or `dark` class on the document root, replacing the other.
 * @param resolvedTheme The concrete theme to show.
 */
export function applyResolvedTheme(resolvedTheme: 'dark' | 'light'): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

/**
 * Applies the cached theme to the document root synchronously. Call it at the
 * top of each entrypoint, before React renders, so the first paint already
 * uses the saved theme. Does nothing when no theme is cached.
 */
export function applyCachedTheme(): void {
  const cached = readCachedTheme()
  if (!cached) return
  if (cached === 'system') {
    applyResolvedTheme(
      globalThis.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
    )
    return
  }
  applyResolvedTheme(cached)
}
