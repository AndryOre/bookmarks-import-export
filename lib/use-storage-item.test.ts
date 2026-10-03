// @vitest-environment jsdom
import { act, createElement, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { showBookmarkIconStore, themeStore } from './storage'
import { createDomHarness } from './testing/dom-harness'
import type { DomHarness } from './testing/dom-harness'
import type { Theme } from './theme-cache'
import { useStorageItem } from './use-storage-item'

const mountedHarnesses: DomHarness[] = []

interface ProbeReport {
  observedThemes: Theme[]
  errors: (Error | undefined)[]
  setters: ((value: Theme) => Promise<void>)[]
  loadedFlags: boolean[]
}

async function mountProbe(initialValue?: Theme) {
  fakeBrowser.reset()
  const report: ProbeReport = {
    observedThemes: [],
    errors: [],
    setters: [],
    loadedFlags: [],
  }
  const harness = createDomHarness()
  mountedHarnesses.push(harness)

  function ThemeProbe() {
    const [theme, setTheme, isLoaded, loadError] = useStorageItem(
      themeStore,
      initialValue,
    )
    useEffect(() => {
      report.loadedFlags.push(isLoaded)
      report.observedThemes.push(theme)
      report.setters.push(setTheme)
      report.errors.push(loadError)
    }, [theme, setTheme, isLoaded, loadError])
    return createElement('span', { 'data-testid': 'value' }, theme)
  }

  return {
    report,
    harness,
    start: () => harness.render(createElement(ThemeProbe)),
    shownValue: () =>
      harness.container.querySelector('[data-testid="value"]')?.textContent,
  }
}

describe('useStorageItem', () => {
  afterEach(() => {
    for (const harness of mountedHarnesses.splice(0)) harness.unmount()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the item fallback first, then the stored value', async () => {
    const probe = await mountProbe()
    await themeStore.setValue('dark')

    await probe.start()

    expect(probe.report.observedThemes[0]).toBe('system')
    expect(probe.shownValue()).toBe('dark')
  })

  it('reports isLoaded false until the first read resolves', async () => {
    const probe = await mountProbe()
    await themeStore.setValue('dark')

    await probe.start()

    expect(probe.report.loadedFlags[0]).toBe(false)
    expect(probe.report.loadedFlags.at(-1)).toBe(true)
  })

  it('starts from the provided initial value instead of the fallback', async () => {
    const probe = await mountProbe('dark')
    await themeStore.setValue('dark')

    await probe.start()

    expect(probe.report.observedThemes[0]).toBe('dark')
  })

  it('reads the real item when the initial value is stale', async () => {
    const probe = await mountProbe('dark')
    await themeStore.setValue('light')

    await probe.start()

    expect(probe.shownValue()).toBe('light')
  })

  it('follows changes made elsewhere through the watcher', async () => {
    const probe = await mountProbe()
    await probe.start()

    await act(async () => {
      await themeStore.setValue('light')
    })

    expect(probe.shownValue()).toBe('light')
  })

  it('falls back when the item is removed', async () => {
    const probe = await mountProbe()
    await themeStore.setValue('dark')
    await probe.start()

    await act(async () => {
      await themeStore.removeValue()
    })

    expect(probe.shownValue()).toBe('system')
  })

  it('writes through the returned setter', async () => {
    const probe = await mountProbe()
    await probe.start()

    await act(async () => {
      await probe.report.setters.at(-1)?.('dark')
    })

    expect(await themeStore.getValue()).toBe('dark')
    expect(probe.shownValue()).toBe('dark')
  })

  it('stops watching after unmount', async () => {
    const probe = await mountProbe()
    await probe.start()
    probe.harness.unmount()

    await themeStore.setValue('dark')
    await showBookmarkIconStore.setValue(false)

    expect(probe.report.observedThemes.at(-1)).toBe('system')
    expect(probe.report.observedThemes).not.toContain('dark')
  })

  it('shows a written value before the storage write settles', async () => {
    const probe = await mountProbe()
    await probe.start()
    const { promise: slowWrite, resolve: releaseWrite } =
      Promise.withResolvers<void>()
    vi.spyOn(themeStore, 'setValue').mockReturnValueOnce(slowWrite)

    let pending: Promise<void> | undefined
    await act(async () => {
      pending = probe.report.setters.at(-1)?.('dark')
    })

    expect(probe.shownValue()).toBe('dark')
    await act(async () => {
      releaseWrite()
      await pending
    })
  })

  it('applies two rapid writes in order', async () => {
    const probe = await mountProbe()
    await probe.start()
    const setTheme = probe.report.setters.at(-1)

    await act(async () => {
      const first = setTheme?.('dark')
      const second = setTheme?.('light')
      await Promise.all([first, second])
    })

    expect(await themeStore.getValue()).toBe('light')
    expect(probe.shownValue()).toBe('light')
  })

  it('reverts the optimistic value when the write fails', async () => {
    const probe = await mountProbe()
    await themeStore.setValue('light')
    await probe.start()
    vi.spyOn(themeStore, 'setValue').mockRejectedValueOnce(new Error('quota'))

    await act(async () => {
      try {
        await probe.report.setters.at(-1)?.('dark')
      } catch {
        return
      }
    })

    expect(probe.shownValue()).toBe('light')
  })

  it('reaches the loaded state with an error when the read rejects', async () => {
    const probe = await mountProbe()
    vi.spyOn(themeStore, 'getValue').mockRejectedValueOnce(new Error('denied'))

    await probe.start()

    expect(probe.report.loadedFlags.at(-1)).toBe(true)
    expect(probe.report.errors.at(-1)?.message).toBe('denied')
    expect(probe.shownValue()).toBe('system')
  })
})
