// @vitest-environment jsdom
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'

const mountedHarnesses: DomHarness[] = []

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('AppRouter', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    fakeBrowser.i18n.getMessage = vi.fn(
      (key: string) => key,
    ) as typeof fakeBrowser.i18n.getMessage
    fakeBrowser.runtime.getManifest = vi.fn().mockReturnValue({
      version: '2.0.0',
    }) as typeof fakeBrowser.runtime.getManifest
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    Element.prototype.scrollTo = vi.fn()
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    for (const harness of mountedHarnesses.splice(0)) harness.unmount()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('redirects an unknown hash route to the Export page', async () => {
    globalThis.location.hash = '#/foo'
    const { AppRouter } = await import('./router')
    const harness = createDomHarness()
    mountedHarnesses.push(harness)

    await harness.render(createElement(AppRouter))

    await vi.waitFor(() => {
      expect(globalThis.location.hash).toBe('#/export')
    })
  })
})
