// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { autoExportNotifyOnFailureStore } from '@/lib/storage'
import { resetFakeI18n } from '@/lib/testing/fake-i18n'

import {
  FAILURE_NOTIFICATION_ID,
  handleNotificationClick,
  notifyAutoExportFailure,
} from './auto-export-notification'

function mockNotificationsApi() {
  const create = vi.fn(async (id: string, ...rest: unknown[]) => {
    void rest
    return id
  })
  const clear = vi.fn(async () => true)
  browser.notifications = {
    create,
    clear,
  } as unknown as typeof browser.notifications
  return { create, clear }
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeI18n()
})

describe('notifyAutoExportFailure', () => {
  it('creates one notification with a localized title and the reason', async () => {
    const { create } = mockNotificationsApi()

    await notifyAutoExportFailure('disk full')

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith(
      FAILURE_NOTIFICATION_ID,
      expect.objectContaining({
        type: 'basic',
        title: 'Snug · Auto-export failed',
        message: 'Reason: disk full',
      }),
    )
  })

  it('reuses one id so a repeated failure replaces the previous notification', async () => {
    const { create } = mockNotificationsApi()

    await notifyAutoExportFailure('first')
    await notifyAutoExportFailure('second')

    const ids = create.mock.calls.map(([id]) => id)
    expect(new Set(ids).size).toBe(1)
  })

  it('creates nothing when the switch is off', async () => {
    const { create } = mockNotificationsApi()
    await autoExportNotifyOnFailureStore.setValue(false)

    await notifyAutoExportFailure('disk full')

    expect(create).not.toHaveBeenCalled()
  })

  it('defaults to on for users who never touched the switch', async () => {
    expect(await autoExportNotifyOnFailureStore.getValue()).toBe(true)
  })

  it('swallows a notifications API error', async () => {
    const { create } = mockNotificationsApi()
    create.mockRejectedValueOnce(new Error('no icon'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(notifyAutoExportFailure('x')).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })
})

describe('handleNotificationClick', () => {
  it('opens the Auto-export page and clears the notification', async () => {
    const { clear } = mockNotificationsApi()
    const createTab = vi.spyOn(browser.tabs, 'create')

    await handleNotificationClick(FAILURE_NOTIFICATION_ID)

    expect(createTab).toHaveBeenCalledWith({
      url: expect.stringMatching(/\/app\.html#\/auto-export$/),
    })
    expect(clear).toHaveBeenCalledWith(FAILURE_NOTIFICATION_ID)
  })

  it('ignores other notifications', async () => {
    const createTab = vi.spyOn(browser.tabs, 'create')

    await handleNotificationClick('something-else')

    expect(createTab).not.toHaveBeenCalled()
  })
})
