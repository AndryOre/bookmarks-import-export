// @vitest-environment jsdom
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'

import { Checkbox } from './checkbox'

const mountedHarnesses: DomHarness[] = []

async function iconClassOf(checked: boolean | 'indeterminate') {
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  await harness.render(createElement(Checkbox, { checked }))
  return harness.container
    .querySelector(':scope [data-slot="checkbox-indicator"] svg')
    ?.getAttribute('class')
}

describe('Checkbox indicator', () => {
  afterEach(() => {
    for (const harness of mountedHarnesses.splice(0)) harness.unmount()
    vi.unstubAllGlobals()
  })

  it('renders a dash for the indeterminate state', async () => {
    expect(await iconClassOf('indeterminate')).toContain('lucide-minus')
  })

  it('renders a tick for the checked state', async () => {
    expect(await iconClassOf(true)).toContain('lucide-check')
  })
})
