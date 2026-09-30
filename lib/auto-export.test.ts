// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  includeDateGroupModifiedStore,
} from '@/lib/storage'
import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'
import type { AutoExportConfig } from '@/lib/types'

import {
  ALARM_NAME,
  computeNextRun,
  readAutoExportLastRun,
  runAutoExport,
  syncAlarm,
} from './auto-export'

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

/**
 * Replaces `browser.action.setBadgeText`/`setBadgeBackgroundColor`
 * (unimplemented in `fakeBrowser`) with `vi.fn`s.
 * @returns The installed mocks.
 */
function mockActionBadge() {
  const setBadgeText = vi.fn(async () => {})
  const setBadgeBackgroundColor = vi.fn(async () => {})
  browser.action.setBadgeText =
    setBadgeText as typeof browser.action.setBadgeText
  browser.action.setBadgeBackgroundColor =
    setBadgeBackgroundColor as typeof browser.action.setBadgeBackgroundColor
  return { setBadgeText, setBadgeBackgroundColor }
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

describe('computeNextRun', () => {
  it('fires 12h from `from` regardless of preferredTime or anchoredToCompletedRun', () => {
    const from = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()

    expect(computeNextRun('12h', '23:59', from, false)).toBe(
      from + 12 * 60 * 60 * 1000,
    )
    expect(computeNextRun('12h', '23:59', from, true)).toBe(
      from + 12 * 60 * 60 * 1000,
    )
  })

  it.each<['1d' | '3d' | '7d', number]>([
    ['1d', 1],
    ['3d', 3],
    ['7d', 7],
  ])(
    'anchored to a completed run, schedules %s exactly %i day(s) after `from` at preferredTime',
    (interval, days) => {
      const from = new Date(2024, 5, 1, 14, 30, 0, 0).getTime()

      const next = computeNextRun(interval, '09:00', from, true)
      const nextDate = new Date(next)

      expect(nextDate.getDate()).toBe(1 + days)
      expect(nextDate.getHours()).toBe(9)
      expect(nextDate.getMinutes()).toBe(0)
    },
  )

  it('reconfiguring, targets preferredTime later today when it is still ahead', () => {
    const from = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()

    const next = computeNextRun('1d', '10:00', from, false)

    expect(next).toBe(new Date(2024, 5, 1, 10, 0, 0, 0).getTime())
  })

  it.each<['1d' | '3d' | '7d', number]>([
    ['1d', 1],
    ['3d', 1],
    ['7d', 1],
  ])(
    'reconfiguring %s, advances only 1 day (never the full interval) when preferredTime already passed today',
    (interval, expectedDays) => {
      const from = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()

      const next = computeNextRun(interval, '07:00', from, false)

      expect(next).toBe(
        new Date(2024, 5, 1 + expectedDays, 7, 0, 0, 0).getTime(),
      )
    },
  )

  it('reconfiguring, never returns a due time at or before `from` (overdue -> next upcoming occurrence)', () => {
    const from = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()

    const next = computeNextRun('1d', '08:00', from, false)

    expect(next).toBeGreaterThan(from)
  })

  it('anchored to a completed run, elapses fewer than 24h across a US spring-forward boundary (March 9 10:00 -> March 10 10:00)', () => {
    process.env.TZ = 'America/New_York'
    const from = new Date(2024, 2, 9, 10, 0, 0, 0).getTime()

    const next = computeNextRun('1d', '10:00', from, true)
    const nextDate = new Date(next)

    expect(nextDate.getDate()).toBe(10)
    expect(nextDate.getHours()).toBe(10)
    expect((next - from) / (60 * 60 * 1000)).toBe(23)
  })

  it('anchored to a completed run, elapses more than 24h across a US fall-back boundary (November 2 10:00 -> November 3 10:00)', () => {
    process.env.TZ = 'America/New_York'
    const from = new Date(2024, 10, 2, 10, 0, 0, 0).getTime()

    const next = computeNextRun('1d', '10:00', from, true)
    const nextDate = new Date(next)

    expect(nextDate.getDate()).toBe(3)
    expect(nextDate.getHours()).toBe(10)
    expect((next - from) / (60 * 60 * 1000)).toBe(25)
  })
})

describe('syncAlarm', () => {
  it('clears the alarm and stores null when auto-export is disabled', async () => {
    await autoExportConfigStore.setValue(baseConfig({ enabled: false }))
    await autoExportNextRunStore.setValue(Date.now() + 1000)
    const clearSpy = vi.spyOn(browser.alarms, 'clear')

    await syncAlarm('config-change')

    expect(clearSpy).toHaveBeenCalledWith(ALARM_NAME)
    expect(await browser.alarms.get(ALARM_NAME)).toBeUndefined()
    expect(await autoExportNextRunStore.getValue()).toBeNull()
  })

  it('clears the alarm and stores null when no format is selected', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))
    await autoExportNextRunStore.setValue(Date.now() + 1000)

    await syncAlarm('config-change')

    expect(await browser.alarms.get(ALARM_NAME)).toBeUndefined()
    expect(await autoExportNextRunStore.getValue()).toBeNull()
  })

  describe('config-change', () => {
    it('recomputes the next run from now and arms a one-shot alarm at it', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
      await autoExportConfigStore.setValue(
        baseConfig({ interval: '1d', preferredTime: '10:00' }),
      )

      await syncAlarm('config-change')

      const expected = new Date(2024, 5, 1, 10, 0, 0, 0).getTime()
      expect(await autoExportNextRunStore.getValue()).toBe(expected)
      const alarm = await browser.alarms.get(ALARM_NAME)
      expect(alarm?.scheduledTime).toBe(expected)
      expect(alarm?.periodInMinutes).toBeUndefined()
    })

    it('overwrites a stale stored next run even if one already exists', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
      await autoExportConfigStore.setValue(
        baseConfig({ interval: '1d', preferredTime: '10:00' }),
      )
      await autoExportNextRunStore.setValue(1)

      await syncAlarm('config-change')

      expect(await autoExportNextRunStore.getValue()).toBe(
        new Date(2024, 5, 1, 10, 0, 0, 0).getTime(),
      )
    })
  })

  describe.each<['startup' | 'install' | 'update']>([
    ['startup'],
    ['install'],
    ['update'],
  ])('%s', (trigger) => {
    it('computes and stores a next run when none is stored, then arms the alarm at it', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
      await autoExportConfigStore.setValue(
        baseConfig({ interval: '1d', preferredTime: '10:00' }),
      )

      await syncAlarm(trigger)

      const expected = new Date(2024, 5, 1, 10, 0, 0, 0).getTime()
      expect(await autoExportNextRunStore.getValue()).toBe(expected)
      const alarm = await browser.alarms.get(ALARM_NAME)
      expect(alarm?.scheduledTime).toBe(expected)
    })

    it('arms the alarm at the stored next run without recomputing it', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
      await autoExportConfigStore.setValue(
        baseConfig({ interval: '1d', preferredTime: '10:00' }),
      )
      const stored = new Date(2024, 5, 3, 10, 0, 0, 0).getTime()
      await autoExportNextRunStore.setValue(stored)

      await syncAlarm(trigger)

      expect(await autoExportNextRunStore.getValue()).toBe(stored)
      const alarm = await browser.alarms.get(ALARM_NAME)
      expect(alarm?.scheduledTime).toBe(stored)
    })

    it('arms a catch-up alarm ~1 minute out when the stored next run is overdue, without changing the stored value', async () => {
      vi.useFakeTimers()
      const now = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()
      vi.setSystemTime(now)
      await autoExportConfigStore.setValue(
        baseConfig({ interval: '1d', preferredTime: '10:00' }),
      )
      const overdue = now - 60 * 60 * 1000
      await autoExportNextRunStore.setValue(overdue)

      await syncAlarm(trigger)

      expect(await autoExportNextRunStore.getValue()).toBe(overdue)
      const alarm = await browser.alarms.get(ALARM_NAME)
      expect(alarm?.scheduledTime).toBe(now + 60_000)
    })
  })
})

describe('readAutoExportLastRun', () => {
  it('returns null when nothing has run yet', async () => {
    expect(await readAutoExportLastRun()).toBeNull()
  })

  it('migrates a legacy numeric value to a successful scheduled run', async () => {
    await autoExportLastRunStore.setValue(1_700_000_000_000)

    expect(await readAutoExportLastRun()).toEqual({
      at: 1_700_000_000_000,
      ok: true,
      trigger: 'scheduled',
    })
  })

  it('returns a structured value as-is', async () => {
    await autoExportLastRunStore.setValue({
      at: 1_700_000_000_000,
      ok: false,
      error: 'boom',
      trigger: 'catch-up',
    })

    expect(await readAutoExportLastRun()).toEqual({
      at: 1_700_000_000_000,
      ok: false,
      error: 'boom',
      trigger: 'catch-up',
    })
  })
})

describe('runAutoExport', () => {
  it('no-ops when auto-export is disabled', async () => {
    await autoExportConfigStore.setValue(baseConfig({ enabled: false }))
    const downloadSpy = mockDownload()

    await runAutoExport('scheduled')

    expect(downloadSpy).not.toHaveBeenCalled()
    expect(await autoExportLastRunStore.getValue()).toBeNull()
  })

  it('no-ops when no format is selected', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))
    const downloadSpy = mockDownload()

    await runAutoExport('scheduled')

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

    await runAutoExport('scheduled')

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

    await runAutoExport('scheduled')

    expect(downloadSpy).toHaveBeenCalledTimes(1)
    const [details] = downloadSpy.mock.calls[0] ?? []
    const csvContent = decodeDataUrlContent(details?.url ?? '')
    expect(csvContent).toContain('https://other-only.example')
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

      await runAutoExport('scheduled')

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: `${expectedPrefix}AutoExport.html`,
        }),
      )
    },
  )

  it('records a successful run with its trigger and clears the badge', async () => {
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
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    mockDownload()
    const { setBadgeText } = mockActionBadge()

    await runAutoExport('catch-up')

    expect(await autoExportLastRunStore.getValue()).toEqual({
      at: Date.now(),
      ok: true,
      trigger: 'catch-up',
    })
    expect(setBadgeText).toHaveBeenCalledWith({ text: '' })
  })

  it('records a failed run with its error and sets the failure badge for a scheduled run', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    mockDownload(async () => {
      throw new Error('disk full')
    })
    const { setBadgeText, setBadgeBackgroundColor } = mockActionBadge()

    await expect(runAutoExport('scheduled')).rejects.toThrow('disk full')

    expect(await autoExportLastRunStore.getValue()).toEqual({
      at: Date.now(),
      ok: false,
      error: 'disk full',
      trigger: 'scheduled',
    })
    expect(setBadgeText).toHaveBeenCalledWith({ text: '!' })
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith(
      expect.objectContaining({ color: expect.any(String) }),
    )
  })

  it('sets the failure badge for a catch-up run', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    mockDownload(async () => {
      throw new Error('disk full')
    })
    const { setBadgeText } = mockActionBadge()

    await expect(runAutoExport('catch-up')).rejects.toThrow('disk full')

    expect(setBadgeText).toHaveBeenCalledWith({ text: '!' })
  })

  it('does not set the failure badge for a failed manual run', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    mockDownload(async () => {
      throw new Error('disk full')
    })
    const { setBadgeText } = mockActionBadge()

    await expect(runAutoExport('manual')).rejects.toThrow('disk full')

    expect(setBadgeText).not.toHaveBeenCalled()
  })

  it('reschedules the next run and re-arms the alarm after a scheduled run', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    mockDownload()
    mockActionBadge()

    await runAutoExport('scheduled')

    const expected = new Date(2024, 5, 2, 10, 0, 0, 0).getTime()
    expect(await autoExportNextRunStore.getValue()).toBe(expected)
    const alarm = await browser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBe(expected)
  })

  it('reschedules the next run even after a failed scheduled run', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    mockDownload(async () => {
      throw new Error('disk full')
    })
    mockActionBadge()

    await expect(runAutoExport('scheduled')).rejects.toThrow('disk full')

    const expected = new Date(2024, 5, 2, 10, 0, 0, 0).getTime()
    expect(await autoExportNextRunStore.getValue()).toBe(expected)
  })

  it('does not reschedule the next run after a manual run', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    await autoExportNextRunStore.setValue(null)
    mockDownload()
    mockActionBadge()

    await runAutoExport('manual')

    expect(await autoExportNextRunStore.getValue()).toBeNull()
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
    mockActionBadge()

    const resolvers: (() => void)[] = []
    mockDownload(
      async () =>
        new Promise<number>((resolve) => {
          resolvers.push(() => resolve(1))
        }),
    )

    const runPromise = runAutoExport('scheduled')

    await vi.waitFor(() => expect(resolvers).toHaveLength(2))
    expect(await autoExportLastRunStore.getValue()).toBeNull()

    resolvers[0]?.()
    await Promise.resolve()
    expect(await autoExportLastRunStore.getValue()).toBeNull()

    resolvers[1]?.()
    await runPromise

    expect(await autoExportLastRunStore.getValue()).toEqual({
      at: Date.now(),
      ok: true,
      trigger: 'scheduled',
    })
  })
})
