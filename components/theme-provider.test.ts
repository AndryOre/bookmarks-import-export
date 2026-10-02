// @vitest-environment jsdom
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { themeStore } from '@/lib/storage'
import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'
import { THEME_CACHE_KEY } from '@/lib/theme-cache'

import { ThemeProvider } from './theme-provider'

const mountedHarnesses: DomHarness[] = []

function stubSystemColorScheme(isDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: isDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

async function mountProvider() {
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  await harness.render(createElement(ThemeProvider, null, 'child'))
  return harness
}

function throwBlockedStorage(): never {
  throw new DOMException('blocked', 'SecurityError')
}

function blockLocalStorage() {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlockedStorage)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlockedStorage)
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    localStorage.clear()
    document.documentElement.className = ''
    stubSystemColorScheme(false)
  })

  afterEach(() => {
    for (const harness of mountedHarnesses.splice(0)) harness.unmount()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('never shows the default theme when dark is cached and the OS is light', async () => {
    localStorage.setItem(THEME_CACHE_KEY, 'dark')
    await themeStore.setValue('dark')
    const classesSeen: string[] = []
    const observer = new MutationObserver(() => {
      classesSeen.push(document.documentElement.className)
    })
    observer.observe(document.documentElement, { attributes: true })

    await mountProvider()
    observer.disconnect()

    expect(classesSeen.length).toBeGreaterThan(0)
    expect(classesSeen.every((classes) => classes === 'dark')).toBe(true)
  })

  it('renders and reads the real item when the cache is blocked', async () => {
    blockLocalStorage()
    await themeStore.setValue('dark')

    const harness = await mountProvider()

    expect(harness.container.textContent).toBe('child')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('keeps the cache in sync with the storage item', async () => {
    await themeStore.setValue('light')
    await mountProvider()
    expect(localStorage.getItem(THEME_CACHE_KEY)).toBe('light')

    await act(async () => {
      await themeStore.setValue('dark')
    })

    expect(localStorage.getItem(THEME_CACHE_KEY)).toBe('dark')
  })
})
