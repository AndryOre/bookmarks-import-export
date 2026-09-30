import type { Browser } from '@wxt-dev/browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import type * as AutoExport from '@/lib/auto-export'
import { ALARM_NAME, RUN_MANUAL_EXPORT_MESSAGE_TYPE } from '@/lib/auto-export'
import { autoExportConfigStore, autoExportNextRunStore } from '@/lib/storage'
import { resetFakeI18n } from '@/lib/testing/fake-i18n'
import type { AutoExportConfig } from '@/lib/types'

import background from '../background'

vi.mock('@/lib/auto-export', async () => {
  const actual = await vi.importActual<typeof AutoExport>('@/lib/auto-export')
  return {
    ...actual,
    syncAlarm: vi.fn(),
    runAutoExport: vi.fn(),
  }
})

const { syncAlarm, runAutoExport } = await import('@/lib/auto-export')

type OnMessageListener = (
  message: unknown,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined

/**
 * `fakeBrowser`'s `runtime.onMessage` throws "not implemented" on
 * `addListener` (unlike `alarms.onAlarm`, which it does implement), so this
 * stubs it with a minimal single-listener registry: `addListener` records
 * the listener `background.ts` registers, and `trigger` calls it the way the
 * real `browser.runtime.sendMessage` would — synchronously, resolving with
 * whatever the listener passes to `sendResponse` (or `undefined` if the
 * listener returns `undefined`/`false`, meaning "not for me").
 * @returns A `trigger` helper that mimics the sender side of `sendMessage`.
 */
function mockRuntimeOnMessage(): {
  trigger: (message: unknown) => Promise<unknown>
} {
  let listener: OnMessageListener | undefined
  browser.runtime.onMessage.addListener = vi.fn((l: unknown) => {
    listener = l as OnMessageListener
  }) as unknown as typeof browser.runtime.onMessage.addListener

  return {
    trigger: (message: unknown) =>
      new Promise((resolve) => {
        const handled = listener?.(
          message,
          {} as Browser.runtime.MessageSender,
          resolve,
        )
        if (!handled) resolve(undefined)
      }),
  }
}

/**
 * `@webext-core/fake-browser` types `onInstalled.trigger()` against
 * `webextension-polyfill`'s `OnInstalledDetailsType`, which only allows
 * Firefox's `install`/`update`/`browser_update` reasons and requires a
 * `temporary` flag. `background.ts` is written against Chrome's reasons
 * (including `chrome_update`/`shared_module_update`), which the fake browser
 * still dispatches correctly at runtime, so this widens the type for tests.
 * @param reason The `runtime.onInstalled` reason to dispatch.
 * @returns The settled results of every registered `onInstalled` listener.
 */
function triggerOnInstalled(
  reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update',
): Promise<unknown> {
  return fakeBrowser.runtime.onInstalled.trigger({
    reason,
    temporary: false,
  } as unknown as Parameters<typeof fakeBrowser.runtime.onInstalled.trigger>[0])
}

function baseConfig(
  overrides: Partial<AutoExportConfig> = {},
): AutoExportConfig {
  return {
    enabled: true,
    interval: '1d',
    preferredTime: '00:00',
    path: 'bookmarks-backup/',
    formats: ['html'],
    ...overrides,
  }
}

const onMessageReference: {
  current?: ReturnType<typeof mockRuntimeOnMessage>
} = {}

/**
 * Dispatches `message` through the listener `background.ts` registered in
 * the current test, via {@link onMessageReference} (set fresh in `beforeEach`).
 * @param message The message to dispatch.
 * @returns Whatever the listener passed to `sendResponse`.
 */
function triggerMessage(message: unknown): Promise<unknown> {
  if (!onMessageReference.current) {
    throw new Error('onMessage mock not installed')
  }
  return onMessageReference.current.trigger(message)
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeI18n()
  vi.clearAllMocks()
  onMessageReference.current = mockRuntimeOnMessage()
  background.main?.()
})

describe('onInstalled', () => {
  it('opens a tab to welcome.html and syncs the alarm on install', async () => {
    await triggerOnInstalled('install')

    await vi.waitFor(async () => {
      const tabs = await fakeBrowser.tabs.query({})
      expect(tabs.map((tab) => tab.url)).toContain(
        fakeBrowser.runtime.getURL('/welcome.html'),
      )
    })
    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('install')
    })
  })

  it('opens a tab to update.html and syncs the alarm on update', async () => {
    fakeBrowser.runtime.getManifest = vi.fn().mockReturnValue({
      version: '1.6.0',
    }) as typeof fakeBrowser.runtime.getManifest

    await triggerOnInstalled('update')

    await vi.waitFor(async () => {
      const tabs = await fakeBrowser.tabs.query({})
      expect(tabs.map((tab) => tab.url)).toContain(
        fakeBrowser.runtime.getURL('/update.html'),
      )
    })
    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('update')
    })
  })

  it('opens no tab but syncs the alarm on chrome_update', async () => {
    const tabsBefore = await fakeBrowser.tabs.query({})

    await triggerOnInstalled('chrome_update')

    const tabs = await fakeBrowser.tabs.query({})
    expect(tabs).toHaveLength(tabsBefore.length)
    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('update')
    })
  })

  it('opens no tab but syncs the alarm on shared_module_update', async () => {
    const tabsBefore = await fakeBrowser.tabs.query({})

    await triggerOnInstalled('shared_module_update')

    const tabs = await fakeBrowser.tabs.query({})
    expect(tabs).toHaveLength(tabsBefore.length)
    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('update')
    })
  })

  it('logs a syncAlarm error instead of throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('sync failed')
    vi.mocked(syncAlarm).mockRejectedValueOnce(error)

    await expect(triggerOnInstalled('install')).resolves.not.toThrow()

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(error)
    })
  })
})

describe('onStartup', () => {
  it('calls syncAlarm with "startup"', async () => {
    await fakeBrowser.runtime.onStartup.trigger()

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('startup')
    })
  })

  it('catches and logs a syncAlarm error instead of throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('sync failed')
    vi.mocked(syncAlarm).mockRejectedValueOnce(error)

    await expect(fakeBrowser.runtime.onStartup.trigger()).resolves.not.toThrow()

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(error)
    })
  })
})

describe('autoExportConfigStore.watch', () => {
  it('calls syncAlarm with "config-change" when enabled changes', async () => {
    await autoExportConfigStore.setValue(baseConfig({ enabled: false }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(baseConfig({ enabled: true }))

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('config-change')
    })
  })

  it('calls syncAlarm with "config-change" when interval changes', async () => {
    await autoExportConfigStore.setValue(baseConfig({ interval: '1d' }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(baseConfig({ interval: '3d' }))

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('config-change')
    })
  })

  it('calls syncAlarm with "config-change" when preferredTime changes', async () => {
    await autoExportConfigStore.setValue(baseConfig({ preferredTime: '00:00' }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(baseConfig({ preferredTime: '10:00' }))

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('config-change')
    })
  })

  it('calls syncAlarm with "config-change" when formats goes from empty to non-empty', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('config-change')
    })
  })

  it('calls syncAlarm with "config-change" when formats goes from non-empty to empty', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledWith('config-change')
    })
  })

  it('does not call syncAlarm when only path changes', async () => {
    await autoExportConfigStore.setValue(baseConfig({ path: 'a/' }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(baseConfig({ path: 'b/' }))

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(syncAlarm).not.toHaveBeenCalled()
  })

  it('does not call syncAlarm when formats changes but stays non-empty', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    vi.clearAllMocks()

    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html', 'json'] }),
    )

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(syncAlarm).not.toHaveBeenCalled()
  })

  it('catches and logs a syncAlarm error instead of throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('sync failed')
    await autoExportConfigStore.setValue(baseConfig({ enabled: false }))
    vi.clearAllMocks()
    vi.mocked(syncAlarm).mockRejectedValueOnce(error)

    await expect(
      autoExportConfigStore.setValue(baseConfig({ enabled: true })),
    ).resolves.not.toThrow()

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(error)
    })
  })
})

describe('alarms.onAlarm', () => {
  it('calls runAutoExport with "scheduled" when the alarm fires at the stored next run', async () => {
    const nextRun = Date.now()
    await autoExportNextRunStore.setValue(nextRun)

    await fakeBrowser.alarms.onAlarm.trigger({
      name: ALARM_NAME,
      scheduledTime: nextRun,
    })

    await vi.waitFor(() => {
      expect(runAutoExport).toHaveBeenCalledWith('scheduled')
    })
  })

  it('calls runAutoExport with "catch-up" when the alarm fires well after the stored next run', async () => {
    const storedNextRun = Date.now() - 60 * 60 * 1000
    await autoExportNextRunStore.setValue(storedNextRun)

    await fakeBrowser.alarms.onAlarm.trigger({
      name: ALARM_NAME,
      scheduledTime: storedNextRun + 60_000,
    })

    await vi.waitFor(() => {
      expect(runAutoExport).toHaveBeenCalledWith('catch-up')
    })
  })

  it('calls runAutoExport with "scheduled" when no next run is stored', async () => {
    await autoExportNextRunStore.setValue(null)

    await fakeBrowser.alarms.onAlarm.trigger({
      name: ALARM_NAME,
      scheduledTime: Date.now(),
    })

    await vi.waitFor(() => {
      expect(runAutoExport).toHaveBeenCalledWith('scheduled')
    })
  })

  it('ignores an alarm with a different name', async () => {
    await fakeBrowser.alarms.onAlarm.trigger({
      name: 'some-other-alarm',
      scheduledTime: Date.now(),
    })

    expect(runAutoExport).not.toHaveBeenCalled()
  })

  it('catches and logs a runAutoExport error instead of throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('run failed')
    vi.mocked(runAutoExport).mockRejectedValueOnce(error)

    await expect(
      fakeBrowser.alarms.onAlarm.trigger({
        name: ALARM_NAME,
        scheduledTime: Date.now(),
      }),
    ).resolves.not.toThrow()

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(error)
    })
  })
})

describe('runtime.onMessage — "Export now"', () => {
  it("runs a manual export with the message's on-screen formats/path and replies { ok: true }", async () => {
    vi.mocked(runAutoExport).mockResolvedValueOnce(undefined)

    const response = await triggerMessage({
      type: RUN_MANUAL_EXPORT_MESSAGE_TYPE,
      formats: ['html', 'json'],
      path: 'on-screen/',
    })

    expect(runAutoExport).toHaveBeenCalledWith('manual', {
      formats: ['html', 'json'],
      path: 'on-screen/',
    })
    expect(response).toEqual({ ok: true })
  })

  it('replies { ok: false, error } when the manual export fails', async () => {
    vi.mocked(runAutoExport).mockRejectedValueOnce(new Error('disk full'))

    const response = await triggerMessage({
      type: RUN_MANUAL_EXPORT_MESSAGE_TYPE,
      formats: ['html'],
      path: '',
    })

    expect(response).toEqual({ ok: false, error: 'disk full' })
  })

  it('does not touch autoExportNextRunStore or the alarm for a manual export', async () => {
    await autoExportNextRunStore.setValue(null)
    vi.mocked(runAutoExport).mockResolvedValueOnce(undefined)

    await triggerMessage({
      type: RUN_MANUAL_EXPORT_MESSAGE_TYPE,
      formats: ['html'],
      path: '',
    })

    expect(await autoExportNextRunStore.getValue()).toBeNull()
    expect(await browser.alarms.get(ALARM_NAME)).toBeUndefined()
    expect(syncAlarm).not.toHaveBeenCalled()
  })

  it('ignores a message with a different type', async () => {
    const response = await triggerMessage({ type: 'some-other-message' })

    expect(runAutoExport).not.toHaveBeenCalled()
    expect(response).toBeUndefined()
  })
})
