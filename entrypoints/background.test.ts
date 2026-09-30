import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import type * as AutoExport from '@/lib/auto-export'
import { ALARM_NAME } from '@/lib/auto-export'
import { autoExportConfigStore } from '@/lib/storage'
import { resetFakeI18n } from '@/lib/testing/fake-i18n'
import type { AutoExportConfig } from '@/lib/types'

import background from './background'

vi.mock('@/lib/auto-export', async () => {
  const actual = await vi.importActual<typeof AutoExport>('@/lib/auto-export')
  return {
    ...actual,
    syncAlarm: vi.fn(),
    runAutoExport: vi.fn(),
  }
})

const { syncAlarm, runAutoExport } = await import('@/lib/auto-export')

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

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeI18n()
  vi.clearAllMocks()
  background.main?.()
})

describe('onInstalled', () => {
  it('opens a tab to welcome.html on install', async () => {
    await triggerOnInstalled('install')

    await vi.waitFor(async () => {
      const tabs = await fakeBrowser.tabs.query({})
      expect(tabs.map((tab) => tab.url)).toContain(
        fakeBrowser.runtime.getURL('/welcome.html'),
      )
    })
  })

  it('opens a tab to update.html on update', async () => {
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
  })

  it('opens no tab on chrome_update', async () => {
    const tabsBefore = await fakeBrowser.tabs.query({})

    await triggerOnInstalled('chrome_update')

    const tabs = await fakeBrowser.tabs.query({})
    expect(tabs).toHaveLength(tabsBefore.length)
  })

  it('opens no tab on shared_module_update', async () => {
    const tabsBefore = await fakeBrowser.tabs.query({})

    await triggerOnInstalled('shared_module_update')

    const tabs = await fakeBrowser.tabs.query({})
    expect(tabs).toHaveLength(tabsBefore.length)
  })
})

describe('onStartup', () => {
  it('calls syncAlarm', async () => {
    await fakeBrowser.runtime.onStartup.trigger()

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledOnce()
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
  const nextConfig: AutoExportConfig = {
    enabled: true,
    interval: '1d',
    preferredTime: '00:00',
    path: 'bookmarks-backup/',
    formats: ['html'],
  }

  it('calls syncAlarm when the auto-export config changes', async () => {
    await autoExportConfigStore.setValue(nextConfig)

    await vi.waitFor(() => {
      expect(syncAlarm).toHaveBeenCalledOnce()
    })
  })

  it('catches and logs a syncAlarm error instead of throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('sync failed')
    vi.mocked(syncAlarm).mockRejectedValueOnce(error)

    await expect(
      autoExportConfigStore.setValue(nextConfig),
    ).resolves.not.toThrow()

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(error)
    })
  })
})

describe('alarms.onAlarm', () => {
  it('calls runAutoExport when the alarm matches ALARM_NAME', async () => {
    await fakeBrowser.alarms.onAlarm.trigger({
      name: ALARM_NAME,
      scheduledTime: Date.now(),
    })

    await vi.waitFor(() => {
      expect(runAutoExport).toHaveBeenCalledOnce()
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
