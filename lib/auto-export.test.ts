// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  autoExportConfigStore,
  autoExportLastRunStore,
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  includeDateGroupModifiedStore,
} from '@/lib/storage'
import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'
import type { AutoExportConfig, AutoExportInterval } from '@/lib/types'

import { ALARM_NAME, runAutoExport, syncAlarm } from './auto-export'

function decodeDataUrlContent(url: string): string {
  const base64 = url.slice(url.indexOf(',') + 1)
  return Buffer.from(base64, 'base64').toString('utf8')
}

/**
 * Replaces `browser.downloads.download` (unimplemented in `fakeBrowser`)
 * with a `vi.fn`, typed against the library's `Promise`-returning overload
 * rather than its callback overload — `vi.spyOn` on an overloaded method
 * otherwise infers the callback (`void`-returning) signature, which rejects
 * `mockResolvedValue`/`mockImplementation` calls that resolve a value.
 * @param implementation Optional stub; defaults to resolving download id `1`.
 * @returns The installed mock, for call-count/call-args assertions.
 */
function mockDownload(
  implementation: (
    details: Browser.downloads.DownloadOptions,
  ) => Promise<number> = async () => 1,
) {
  const mock = vi.fn(implementation)
  browser.downloads.download = mock as typeof browser.downloads.download
  return mock
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

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('syncAlarm', () => {
  it('clears and recreates the alarm when enabled with at least one format', async () => {
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '23:59' }),
    )
    const clearSpy = vi.spyOn(browser.alarms, 'clear')
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(clearSpy).toHaveBeenCalledWith(ALARM_NAME)
    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ periodInMinutes: 1440 }),
    )
  })

  it('only clears the alarm when auto-export is disabled', async () => {
    await autoExportConfigStore.setValue(
      baseConfig({ enabled: false, formats: ['html'] }),
    )
    const clearSpy = vi.spyOn(browser.alarms, 'clear')
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(clearSpy).toHaveBeenCalledWith(ALARM_NAME)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('only clears the alarm when no format is selected', async () => {
    await autoExportConfigStore.setValue(
      baseConfig({ enabled: true, formats: [] }),
    )
    const clearSpy = vi.spyOn(browser.alarms, 'clear')
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(clearSpy).toHaveBeenCalledWith(ALARM_NAME)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('floors the delay at 0.1 minutes when the next run is imminent', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 10, 0, 59, 900))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '1d', preferredTime: '10:01' }),
    )
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ delayInMinutes: 0.1 }),
    )
  })

  it.each<[AutoExportInterval, number]>([
    ['12h', 720],
    ['1d', 1440],
    ['3d', 4320],
    ['7d', 10_080],
  ])(
    'sets periodInMinutes to %i minutes for the %s interval',
    async (interval, expectedPeriod) => {
      await autoExportConfigStore.setValue(baseConfig({ interval }))
      const createSpy = vi.spyOn(browser.alarms, 'create')

      await syncAlarm()

      expect(createSpy).toHaveBeenCalledWith(
        ALARM_NAME,
        expect.objectContaining({ periodInMinutes: expectedPeriod }),
      )
    },
  )

  it('fires 12h from now regardless of preferredTime', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '12h', preferredTime: '23:59' }),
    )
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ delayInMinutes: 720 }),
    )
  })

  it('targets preferredTime today when it is still ahead', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '1d', preferredTime: '10:00' }),
    )
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ delayInMinutes: 120 }),
    )
  })

  it('advances by 1 day when preferredTime has already passed today (1d)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '1d', preferredTime: '07:00' }),
    )
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ delayInMinutes: 23 * 60 }),
    )
  })

  it('advances by 3 days when preferredTime has already passed today (3d)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '3d', preferredTime: '07:00' }),
    )
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ delayInMinutes: 2 * 24 * 60 + 23 * 60 }),
    )
  })

  it('advances by 7 days when preferredTime has already passed today (7d)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '7d', preferredTime: '07:00' }),
    )
    const createSpy = vi.spyOn(browser.alarms, 'create')

    await syncAlarm()

    expect(createSpy).toHaveBeenCalledWith(
      ALARM_NAME,
      expect.objectContaining({ delayInMinutes: 6 * 24 * 60 + 23 * 60 }),
    )
  })
})

describe('runAutoExport', () => {
  it('no-ops when auto-export is disabled', async () => {
    await autoExportConfigStore.setValue(baseConfig({ enabled: false }))
    const downloadSpy = mockDownload()

    await runAutoExport()

    expect(downloadSpy).not.toHaveBeenCalled()
    expect(await autoExportLastRunStore.getValue()).toBeNull()
  })

  it('no-ops when no format is selected', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))
    const downloadSpy = mockDownload()

    await runAutoExport()

    expect(downloadSpy).not.toHaveBeenCalled()
    expect(await autoExportLastRunStore.getValue()).toBeNull()
  })

  it('downloads one file per selected format with the correct filename, MIME, saveAs and conflictAction', async () => {
    seedFakeBookmarksTree([
      {
        id: '10',
        parentId: '1',
        title: 'A',
        url: 'https://a.example',
        syncing: false,
      },
    ])
    await autoExportConfigStore.setValue(
      baseConfig({ path: 'backups/auto/', formats: ['html', 'json', 'csv'] }),
    )
    await exportFilenameTemplateStore.setValue('AutoExport')
    const downloadSpy = mockDownload()

    await runAutoExport()

    expect(downloadSpy).toHaveBeenCalledTimes(3)

    const calls = downloadSpy.mock.calls.map(([details]) => details)
    const byFilename = new Map(calls.map((call) => [call.filename, call]))

    const html = byFilename.get('backups/auto/AutoExport.html')
    expect(html).toBeDefined()
    expect(html?.url.startsWith('data:text/html;base64,')).toBe(true)
    expect(html?.saveAs).toBe(false)
    expect(html?.conflictAction).toBe('uniquify')

    const json = byFilename.get('backups/auto/AutoExport.json')
    expect(json).toBeDefined()
    expect(json?.url.startsWith('data:application/json;base64,')).toBe(true)
    expect(json?.saveAs).toBe(false)
    expect(json?.conflictAction).toBe('uniquify')

    const csv = byFilename.get('backups/auto/AutoExport.csv')
    expect(csv).toBeDefined()
    expect(csv?.url.startsWith('data:text/csv;base64,')).toBe(true)
    expect(csv?.saveAs).toBe(false)
    expect(csv?.conflictAction).toBe('uniquify')
  })

  it('omits hideOtherBookmarks and includeDateGroupModified for the CSV download', async () => {
    seedFakeBookmarksTree(
      [],
      [
        {
          id: '20',
          parentId: '2',
          title: 'Other',
          url: 'https://other-only.example',
          syncing: false,
        },
      ],
    )
    await autoExportConfigStore.setValue(
      baseConfig({ path: 'backups/', formats: ['csv'] }),
    )
    await exportFilenameTemplateStore.setValue('AutoExport')
    await hideOtherBookmarksStore.setValue(true)
    await includeDateGroupModifiedStore.setValue(true)
    const downloadSpy = mockDownload()

    await runAutoExport()

    expect(downloadSpy).toHaveBeenCalledTimes(1)
    const [details] = downloadSpy.mock.calls[0] ?? []
    const csvContent = decodeDataUrlContent(details?.url ?? '')
    expect(csvContent).toContain('https://other-only.example')
  })

  it('sets autoExportLastRunStore only after every selected download resolves', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    seedFakeBookmarksTree([
      {
        id: '10',
        parentId: '1',
        title: 'A',
        url: 'https://a.example',
        syncing: false,
      },
    ])
    await autoExportConfigStore.setValue(
      baseConfig({ path: 'backups/', formats: ['html', 'json'] }),
    )
    await exportFilenameTemplateStore.setValue('AutoExport')

    const resolvers: (() => void)[] = []
    mockDownload(
      async () =>
        new Promise<number>((resolve) => {
          resolvers.push(() => resolve(1))
        }),
    )

    const runPromise = runAutoExport()

    await vi.waitFor(() => expect(resolvers).toHaveLength(2))
    expect(await autoExportLastRunStore.getValue()).toBeNull()

    resolvers[0]?.()
    await Promise.resolve()
    expect(await autoExportLastRunStore.getValue()).toBeNull()

    resolvers[1]?.()
    await runPromise

    expect(await autoExportLastRunStore.getValue()).toBe(Date.now())
  })

  it.each<[string, string]>([
    ['/leading/slash/', 'leading/slash/'],
    ['exports/../attempt/', 'exports/attempt/'],
    ['double//slash///path/', 'double/slash/path/'],
  ])(
    'sanitizes the configured path %s -> %s',
    async (rawPath, expectedPrefix) => {
      seedFakeBookmarksTree([
        {
          id: '10',
          parentId: '1',
          title: 'A',
          url: 'https://a.example',
          syncing: false,
        },
      ])
      await autoExportConfigStore.setValue(
        baseConfig({ path: rawPath, formats: ['html'] }),
      )
      await exportFilenameTemplateStore.setValue('AutoExport')
      const downloadSpy = mockDownload()

      await runAutoExport()

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: `${expectedPrefix}AutoExport.html`,
        }),
      )
    },
  )
})
