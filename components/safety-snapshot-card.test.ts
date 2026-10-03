// @vitest-environment jsdom
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'
import { resetFakeI18n } from '@/lib/testing/fake-i18n'

import { SafetySnapshotCard } from './safety-snapshot-card'

const restoreMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/safety-snapshot', () => ({
  safetySnapshotStore: {},
  restoreSafetySnapshot: restoreMock,
}))

vi.mock('@/lib/use-storage-item', () => ({
  useStorageItem: () => [
    {
      takenAt: 1,
      roots: [
        {
          id: '1',
          title: 'Bookmarks bar',
          dateAdded: 0,
          children: [{ title: 'A', url: 'https://a.example/', dateAdded: 0 }],
        },
      ],
    },
  ],
}))

const mountedHarnesses: DomHarness[] = []

beforeEach(() => {
  resetFakeI18n()
})

afterEach(() => {
  for (const harness of mountedHarnesses.splice(0)) harness.unmount()
  document.body.replaceChildren()
  restoreMock.mockReset()
  vi.unstubAllGlobals()
})

function confirmButton(): HTMLButtonElement {
  const buttons = document.body.querySelectorAll<HTMLButtonElement>(
    ':scope [role="alertdialog"] button',
  )
  const button = [...buttons].at(-1)
  if (!button) throw new Error('confirm button missing')
  return button
}

async function openConfirmDialog(): Promise<void> {
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  await harness.render(createElement(SafetySnapshotCard))
  const trigger = harness.container.querySelector<HTMLButtonElement>('button')
  if (!trigger) throw new Error('trigger missing')
  await act(async () => {
    trigger.click()
  })
}

describe('SafetySnapshotCard', () => {
  it('starts exactly one restore on a fast double click', async () => {
    restoreMock.mockImplementation(() => new Promise(() => {}))
    await openConfirmDialog()
    const confirm = confirmButton()

    await act(async () => {
      confirm.click()
      confirm.click()
    })

    expect(restoreMock).toHaveBeenCalledTimes(1)
  })

  it('allows another restore after the first one failed', async () => {
    restoreMock.mockRejectedValueOnce(new Error('boom'))
    restoreMock.mockResolvedValueOnce(undefined)
    await openConfirmDialog()

    await act(async () => {
      confirmButton().click()
    })
    await act(async () => {
      document.body
        .querySelectorAll<HTMLButtonElement>('button')
        .forEach((button) => {
          if (!button.closest('[role="alertdialog"]') && !button.disabled) {
            button.click()
          }
        })
    })
    await act(async () => {
      confirmButton().click()
    })

    expect(restoreMock).toHaveBeenCalledTimes(2)
  })
})
