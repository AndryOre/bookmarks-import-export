// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyCachedTheme,
  readCachedTheme,
  THEME_CACHE_KEY,
  writeCachedTheme,
} from './theme-cache'

function stubSystemPrefersDark(isDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: isDark })),
  )
}

describe('theme cache', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('round-trips a valid theme', () => {
    writeCachedTheme('dark')
    expect(localStorage.getItem(THEME_CACHE_KEY)).toBe('dark')
    expect(readCachedTheme()).toBe('dark')
  })

  it('returns undefined for a missing or corrupt value', () => {
    expect(readCachedTheme()).toBeUndefined()
    localStorage.setItem(THEME_CACHE_KEY, 'purple')
    expect(readCachedTheme()).toBeUndefined()
  })

  it('applies the cached dark theme to the root before any render', () => {
    writeCachedTheme('dark')
    applyCachedTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('resolves a cached system theme from the OS preference', () => {
    stubSystemPrefersDark(true)
    writeCachedTheme('system')
    applyCachedTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('leaves the root untouched when nothing is cached', () => {
    applyCachedTheme()
    expect(document.documentElement.className).toBe('')
  })

  it('survives blocked storage on read, write and apply', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readCachedTheme()).toBeUndefined()
    expect(() => writeCachedTheme('dark')).not.toThrow()
    expect(() => applyCachedTheme()).not.toThrow()
  })
})
