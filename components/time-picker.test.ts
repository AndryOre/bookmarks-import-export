// @vitest-environment jsdom
import { act, createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'

import { TimePicker } from './time-picker'

const mountedHarnesses: DomHarness[] = []

async function mountPicker(onChange: (value: string) => void) {
  Element.prototype.scrollIntoView = vi.fn()
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  await harness.render(
    createElement(TimePicker, {
      id: 'picker',
      value: '09:00',
      onChange,
      hourLabel: 'Hours',
      minuteLabel: 'Minutes',
      periodLabel: 'Period',
      locale: 'en-GB',
    }),
  )
  const trigger = harness.container.querySelector<HTMLElement>('#picker')
  if (!trigger) throw new Error('trigger missing')
  await act(async () => {
    trigger.click()
  })
  return { trigger }
}

function selectedMinute(): HTMLElement {
  const option = document.body.querySelector<HTMLElement>(
    ':scope [aria-label="Minutes"] [aria-selected="true"]',
  )
  if (!option) throw new Error('minute option missing')
  return option
}

async function press(element: HTMLElement, key: string) {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
}

afterEach(() => {
  for (const harness of mountedHarnesses.splice(0)) harness.unmount()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('TimePicker', () => {
  it('emits nothing while stepping and one value when committed', async () => {
    const onChange = vi.fn()
    await mountPicker(onChange)

    await press(selectedMinute(), 'ArrowDown')
    await press(selectedMinute(), 'ArrowDown')
    await press(selectedMinute(), 'ArrowDown')
    expect(onChange).not.toHaveBeenCalled()

    await press(selectedMinute(), 'Enter')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('09:03')
  })

  it('emits nothing when closed without a change', async () => {
    const onChange = vi.fn()
    await mountPicker(onChange)

    await press(selectedMinute(), 'Escape')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('emits nothing when stepping returns to the original value', async () => {
    const onChange = vi.fn()
    await mountPicker(onChange)

    await press(selectedMinute(), 'ArrowDown')
    await press(selectedMinute(), 'ArrowUp')
    await press(selectedMinute(), 'Enter')
    expect(onChange).not.toHaveBeenCalled()
  })
})
