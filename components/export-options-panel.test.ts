// @vitest-environment jsdom
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { exportFilenameTemplateStore } from '@/lib/storage'
import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'

import { ExportOptionsPanel } from './export-options-panel'

const mountedHarnesses: DomHarness[] = []

function noop() {}

async function mountPanel() {
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  await harness.render(createElement(ExportOptionsPanel))
  const input = harness.container.querySelector<HTMLInputElement>(
    '#export-options-filename',
  )
  if (!input) throw new Error('filename input missing')
  return { harness, input }
}

async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function blur(input: HTMLInputElement) {
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

async function flushStorage() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

describe('ExportOptionsPanel filename draft', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    fakeBrowser.i18n.getMessage = vi.fn(
      (key: string) => key,
    ) as typeof fakeBrowser.i18n.getMessage
  })

  afterEach(() => {
    for (const harness of mountedHarnesses.splice(0)) harness.unmount()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the stored template once loaded', async () => {
    await exportFilenameTemplateStore.setValue('stored-{date}')
    const { input } = await mountPanel()
    await flushStorage()

    expect(input.value).toBe('stored-{date}')
  })

  it('does not write to storage on every keystroke', async () => {
    const { input } = await mountPanel()
    await flushStorage()
    const before = await exportFilenameTemplateStore.getValue()

    await typeInto(input, 'a')
    await typeInto(input, 'ab')
    await flushStorage()

    expect(await exportFilenameTemplateStore.getValue()).toBe(before)
  })

  it('persists the final draft on blur', async () => {
    const { input } = await mountPanel()
    await flushStorage()

    await typeInto(input, 'abd')
    await blur(input)
    await flushStorage()

    expect(await exportFilenameTemplateStore.getValue()).toBe('abd')
  })

  it('flushes a pending draft on pagehide before the debounce fires', async () => {
    const { input } = await mountPanel()
    await flushStorage()

    await typeInto(input, 'Backup %yyyy')
    await act(async () => {
      globalThis.dispatchEvent(new Event('pagehide'))
    })
    await flushStorage()

    expect(await exportFilenameTemplateStore.getValue()).toBe('Backup %yyyy')
  })

  it('flushes a pending draft when the page becomes hidden', async () => {
    const { input } = await mountPanel()
    await flushStorage()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

    await typeInto(input, 'Backup %yyyy')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await flushStorage()

    expect(await exportFilenameTemplateStore.getValue()).toBe('Backup %yyyy')
  })

  it('persists the draft after the debounce delay', async () => {
    const { input } = await mountPanel()
    await flushStorage()

    await typeInto(input, 'abd')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
    })

    expect(await exportFilenameTemplateStore.getValue()).toBe('abd')
  })

  it('keeps typed characters when a delayed echo of an earlier write arrives', async () => {
    let deliverEcho: ((value: string | null) => void) | undefined
    vi.spyOn(exportFilenameTemplateStore, 'watch').mockImplementation(
      (callback) => {
        deliverEcho = callback as (value: string | null) => void
        return noop
      },
    )
    const { input } = await mountPanel()
    await flushStorage()

    await typeInto(input, 'a')
    await blur(input)
    await flushStorage()
    await typeInto(input, 'ab')
    await typeInto(input, 'abd')
    await act(async () => {
      deliverEcho?.('a')
    })

    expect(input.value).toBe('abd')
    await blur(input)
    await flushStorage()
    expect(await exportFilenameTemplateStore.getValue()).toBe('abd')
  })

  it('adopts a template changed from elsewhere', async () => {
    const { input } = await mountPanel()
    await flushStorage()

    await act(async () => {
      await exportFilenameTemplateStore.setValue('from-elsewhere')
    })

    expect(input.value).toBe('from-elsewhere')
  })
})
