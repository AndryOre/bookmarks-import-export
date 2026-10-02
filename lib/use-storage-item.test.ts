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
  setters: ((value: Theme) => Promise<void>)[]
}

async function mountProbe(initialValue?: Theme) {
  fakeBrowser.reset()
  const report: ProbeReport = { observedThemes: [], setters: [] }
  const harness = createDomHarness()
  mountedHarnesses.push(harness)

  function ThemeProbe() {
    const [theme, setTheme] = useStorageItem(themeStore, initialValue)
    useEffect(() => {
      report.observedThemes.push(theme)
      report.setters.push(setTheme)
    }, [theme, setTheme])
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
  })

  it('renders the item fallback first, then the stored value', async () => {
    const probe = await mountProbe()
    await themeStore.setValue('dark')

    await probe.start()

    expect(probe.report.observedThemes[0]).toBe('system')
    expect(probe.shownValue()).toBe('dark')
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

    expect(probe.report.observedThemes).toEqual(['system'])
  })
})
