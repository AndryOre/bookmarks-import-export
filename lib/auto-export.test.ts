// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  autoExportConfigStore,
  autoExportDownloadIdsStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
  autoExportRunInFlightStore,
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
  computeNextRunAfterDue,
  readAutoExportLastRun,
  runAutoExport,
  syncAlarm,
} from './auto-export'
import {
  CREATE_BLOB_URL_MESSAGE_TYPE,
  DOWNLOAD_SETTLE_TIMEOUT_MS,
} from './offscreen-download'

type OnChangedListener = (delta: Browser.downloads.DownloadDelta) => void

/**
 * Replaces `chrome.offscreen` (unimplemented in `fakeBrowser`) with `vi.fn`
 * stubs so `downloadViaOffscreenDocument` can create/close the offscreen
 * document `runAutoExport`'s downloads now go through.
 */
function mockOffscreenApi(): void {
  chrome.offscreen = {
    createDocument: vi.fn(async () => {}),
    closeDocument: vi.fn(async () => {}),
  } as unknown as typeof chrome.offscreen
  chrome.runtime.getContexts = vi.fn(
    async () => [],
  ) as unknown as typeof chrome.runtime.getContexts
}

/**
 * Replaces `browser.runtime.sendMessage` (unimplemented in `fakeBrowser`)
 * with a `vi.fn` that answers a blob-url-creation request with the request's
 * own `content` decoded as a fake `blob:` URL, so a test can recover the
 * exported content each download was asked to save without a real `Blob`
 * registry.
 */
function mockRuntimeSendMessage(): void {
  const mock = vi.fn(
    async (message: { type: string; content?: string; url?: string }) => {
      if (message.type === CREATE_BLOB_URL_MESSAGE_TYPE) {
        return {
          url: `blob:${Buffer.from(message.content ?? '', 'utf8').toString('base64')}`,
        }
      }
      return
    },
  )
  browser.runtime.sendMessage =
    mock as unknown as typeof browser.runtime.sendMessage
}

function decodeBlobUrlContent(url: string): string {
  const base64 = url.slice('blob:'.length)
  return Buffer.from(base64, 'base64').toString('utf8')
}

/**
 * Replaces `browser.downloads.download` and `browser.downloads.onChanged`
 * (unimplemented in `fakeBrowser`) with `vi.fn` stubs: `download` resolves
 * with incrementing ids (or the given `implementation`), and `completeAll`
 * dispatches a `'complete'` `onChanged` event to every id issued so far, for
 * a test to call once it knows every expected download has started.
 * @param implementation Optional stub; defaults to resolving with an
 *   incrementing id.
 * @returns The installed `download` mock plus a `completeAll` helper.
 */
function mockDownload(
  implementation?: (
    details: Browser.downloads.DownloadOptions,
  ) => Promise<number>,
) {
  let nextId = 1
  const issuedIds: number[] = []
  const listeners: OnChangedListener[] = []

  const mock = vi.fn(
    implementation ??
      (async () => {
        const id = nextId++
        issuedIds.push(id)
        return id
      }),
  )
  browser.downloads.download = mock as typeof browser.downloads.download
  browser.downloads.onChanged.addListener = vi.fn((listener: unknown) => {
    listeners.push(listener as OnChangedListener)
  }) as typeof browser.downloads.onChanged.addListener
  browser.downloads.onChanged.removeListener = vi.fn((listener: unknown) => {
    const index = listeners.indexOf(listener as OnChangedListener)
    if (index !== -1) listeners.splice(index, 1)
  }) as typeof browser.downloads.onChanged.removeListener

  function fire(id: number, state: 'complete' | 'interrupted' = 'complete') {
    for (const listener of listeners) {
      listener({
        id,
        state: { current: state },
      } as Browser.downloads.DownloadDelta)
    }
  }

  function completeAll(): void {
    for (const id of issuedIds) fire(id, 'complete')
  }

  return { mock, completeAll, fire }
}

/**
 * Runs `runAutoExport()` to completion against the `mockDownload` helper
 * above: awaits (via `vi.waitFor`, so it tolerates the real async work
 * `exportToHTML`'s favicon fetch does) until every expected download has
 * called `browser.downloads.download`, fires `'complete'` for each of them,
 * then awaits the run itself.
 * @param downloadSpy The `mock` returned by `mockDownload`.
 * @param completeAll The `completeAll` helper returned by `mockDownload`.
 * @param expectedDownloadCount How many downloads this run should start.
 * @param trigger What caused this run; defaults to `'scheduled'`.
 */
async function runAutoExportAndSettle(
  downloadSpy: ReturnType<typeof mockDownload>['mock'],
  completeAll: () => void,
  expectedDownloadCount: number,
  trigger: 'scheduled' | 'catch-up' | 'manual' = 'scheduled',
): Promise<void> {
  const runPromise = runAutoExport(trigger)
  await vi.waitFor(() =>
    expect(downloadSpy).toHaveBeenCalledTimes(expectedDownloadCount),
  )
  completeAll()
  await runPromise
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

/**
 * Replaces `browser.notifications` (unimplemented in `fakeBrowser`) with a
 * `vi.fn` for `create`.
 * @returns The `create` mock.
 */
function mockNotifications() {
  const create = vi.fn(async () => 'auto-export-failure')
  browser.notifications = {
    create,
    clear: vi.fn(async () => true),
  } as unknown as typeof browser.notifications
  return create
}

function baseConfig(
  overrides: Partial<AutoExportConfig> = {},
): AutoExportConfig {
  return {
    enabled: true,
    interval: '1d',
    preferredTime: '00:00',
    dayOfWeek: 1,
    path: 'bookmarks-backup/',
    formats: ['html'],
    keepLast: 10,
    ...overrides,
  }
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  mockOffscreenApi()
  mockRuntimeSendMessage()
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

  it.each<['1d' | '3d', number]>([
    ['1d', 1],
    ['3d', 3],
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

  it('fires 1h from `from` regardless of preferredTime or anchoredToCompletedRun', () => {
    const from = new Date(2024, 5, 1, 8, 15, 0, 0).getTime()

    expect(computeNextRun('1h', '23:59', from, false)).toBe(from + 3_600_000)
    expect(computeNextRun('1h', '23:59', from, true)).toBe(from + 3_600_000)
  })

  describe('weekly (7d)', () => {
    const saturday = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()

    it('reconfiguring, targets a weekday earlier in the week than today in the following week', () => {
      const next = computeNextRun('7d', '09:30', saturday, false, 1)

      expect(next).toBe(new Date(2024, 5, 3, 9, 30, 0, 0).getTime())
    })

    it('reconfiguring, targets a later weekday this week', () => {
      const next = computeNextRun('7d', '09:30', saturday, false, 0)

      expect(next).toBe(new Date(2024, 5, 2, 9, 30, 0, 0).getTime())
    })

    it('reconfiguring on the chosen day, runs today if the time is ahead and next week if it passed', () => {
      expect(computeNextRun('7d', '10:00', saturday, false, 6)).toBe(
        new Date(2024, 5, 1, 10, 0, 0, 0).getTime(),
      )
      expect(computeNextRun('7d', '07:00', saturday, false, 6)).toBe(
        new Date(2024, 5, 8, 7, 0, 0, 0).getTime(),
      )
    })

    it('anchored to a completed run on the chosen day, reschedules exactly 7 days out', () => {
      const next = computeNextRun('7d', '07:00', saturday, true, 6)

      expect(next).toBe(new Date(2024, 5, 8, 7, 0, 0, 0).getTime())
    })

    it('anchored to a late catch-up run, reschedules to the next chosen day rather than +7 days', () => {
      const wednesday = new Date(2024, 5, 5, 8, 0, 0, 0).getTime()

      const next = computeNextRun('7d', '07:00', wednesday, true, 1)

      expect(next).toBe(new Date(2024, 5, 10, 7, 0, 0, 0).getTime())
    })

    it('keeps the wall-clock time across a US spring-forward boundary', () => {
      process.env.TZ = 'America/New_York'
      const from = new Date(2024, 2, 5, 12, 0, 0, 0).getTime()

      const next = computeNextRun('7d', '10:00', from, false, 0)

      expect(next).toBe(new Date(2024, 2, 10, 10, 0, 0, 0).getTime())
      expect(new Date(next).getHours()).toBe(10)
    })
  })

  it('reconfiguring, targets preferredTime later today when it is still ahead', () => {
    const from = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()

    const next = computeNextRun('1d', '10:00', from, false)

    expect(next).toBe(new Date(2024, 5, 1, 10, 0, 0, 0).getTime())
  })

  it.each<['1d' | '3d', number]>([
    ['1d', 1],
    ['3d', 1],
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

describe('syncAlarm for the new intervals', () => {
  it('arms an hourly config-change alarm one hour out', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(baseConfig({ interval: '1h' }))

    await syncAlarm('config-change')

    const expected = new Date(2024, 5, 1, 9, 0, 0, 0).getTime()
    expect(await autoExportNextRunStore.getValue()).toBe(expected)
    const alarm = await fakeBrowser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBe(expected)
  })

  it('arms a weekly alarm on the chosen day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ interval: '7d', preferredTime: '06:00', dayOfWeek: 3 }),
    )

    await syncAlarm('config-change')

    const expected = new Date(2024, 5, 5, 6, 0, 0, 0).getTime()
    expect(await autoExportNextRunStore.getValue()).toBe(expected)
    const alarm = await fakeBrowser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBe(expected)
  })

  it.each<['1h' | '7d']>([['1h'], ['7d']])(
    'catches up an overdue %s next run about a minute out without changing it',
    async (interval) => {
      vi.useFakeTimers()
      const now = new Date(2024, 5, 1, 8, 0, 0, 0).getTime()
      vi.setSystemTime(now)
      await autoExportConfigStore.setValue(baseConfig({ interval }))
      const overdue = now - 3_600_000
      await autoExportNextRunStore.setValue(overdue)

      await syncAlarm('startup')

      expect(await autoExportNextRunStore.getValue()).toBe(overdue)
      const alarm = await fakeBrowser.alarms.get(ALARM_NAME)
      expect(alarm?.scheduledTime).toBe(now + 60_000)
    },
  )
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
    const { mock: downloadSpy } = mockDownload()

    await runAutoExport('scheduled')

    expect(downloadSpy).not.toHaveBeenCalled()
    expect(await autoExportLastRunStore.getValue()).toBeNull()
  })

  it('no-ops when no format is selected', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))
    const { mock: downloadSpy } = mockDownload()

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
    const { mock: downloadSpy, completeAll } = mockDownload()

    await runAutoExportAndSettle(downloadSpy, completeAll, 3)

    expect(downloadSpy).toHaveBeenCalledTimes(3)

    const calls = downloadSpy.mock.calls.map(([details]) => details)
    const byFilename = new Map(calls.map((call) => [call.filename, call]))

    const html = byFilename.get('backups/auto/AutoExport.html')
    expect(html).toBeDefined()
    expect(html?.url.startsWith('blob:')).toBe(true)
    expect(html?.saveAs).toBe(false)
    expect(html?.conflictAction).toBe('uniquify')

    const json = byFilename.get('backups/auto/AutoExport.json')
    expect(json).toBeDefined()
    expect(json?.url.startsWith('blob:')).toBe(true)
    expect(json?.saveAs).toBe(false)
    expect(json?.conflictAction).toBe('uniquify')

    const csv = byFilename.get('backups/auto/AutoExport.csv')
    expect(csv).toBeDefined()
    expect(csv?.url.startsWith('blob:')).toBe(true)
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
    const { mock: downloadSpy, completeAll } = mockDownload()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1)

    expect(downloadSpy).toHaveBeenCalledTimes(1)
    const [details] = downloadSpy.mock.calls[0] ?? []
    const csvContent = decodeBlobUrlContent(details?.url ?? '')
    expect(csvContent).toContain('https://other-only.example')
  })

  it.each<[string, string]>([
    ['/leading/slash/', 'leading/slash/'],
    ['exports/../attempt/', 'exports/attempt/'],
    ['double//slash///path/', 'double/slash/path/'],
    ['back<up>s:"|/?*/', 'backups/'],
    ['exports/My:Drive/', 'exports/MyDrive/'],
    [`exports/tab\ttest/`, 'exports/tabtest/'],
    ['.backups', 'backups/'],
    ['Backups /snug', 'Backups/snug/'],
    ['a/.../b', 'a/b/'],
    ['a/./b', 'a/b/'],
    [String.raw`Backups\..\Snug`, 'Backups/Snug/'],
    [String.raw`Backups.\Snug`, 'Backups/Snug/'],
    ['con/nul.txt', '_con/_nul.txt/'],
    ['exports/trail. /x', 'exports/trail/x/'],
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
      const { mock: downloadSpy, completeAll } = mockDownload()

      await runAutoExportAndSettle(downloadSpy, completeAll, 1)

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: `${expectedPrefix}AutoExport.html`,
        }),
      )
    },
  )

  it('records a successful run with its trigger and clears the badge', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
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
    const { mock: downloadSpy, completeAll } = mockDownload()
    const { setBadgeText } = mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'catch-up')

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

  it.each(['scheduled', 'catch-up', 'manual'] as const)(
    'creates exactly one Failure notification for a failed %s run',
    async (trigger) => {
      await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
      mockDownload(async () => {
        throw new Error('disk full')
      })
      mockActionBadge()
      const create = mockNotifications()

      await expect(runAutoExport(trigger)).rejects.toThrow('disk full')

      expect(create).toHaveBeenCalledTimes(1)
    },
  )

  it('creates no notification for a successful run', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()
    const create = mockNotifications()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1)

    expect(create).not.toHaveBeenCalled()
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
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'scheduled')

    const expected = new Date(2024, 5, 2, 10, 0, 0, 0).getTime()
    expect(await autoExportNextRunStore.getValue()).toBe(expected)
    const alarm = await browser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBe(expected)
  })

  it('reschedules an hourly run one hour after it completes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1h' }),
    )
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'scheduled')

    const nextRun = await autoExportNextRunStore.getValue()
    expect(nextRun).toBeGreaterThanOrEqual(
      new Date(2024, 5, 1, 9, 0, 0, 0).getTime(),
    )
    expect(nextRun).toBeLessThan(new Date(2024, 5, 1, 9, 0, 5, 0).getTime())
  })

  it('reschedules a weekly run to its chosen day after it completes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({
        formats: ['html'],
        interval: '7d',
        preferredTime: '10:00',
        dayOfWeek: 3,
      }),
    )
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'scheduled')

    expect(await autoExportNextRunStore.getValue()).toBe(
      new Date(2024, 5, 5, 10, 0, 0, 0).getTime(),
    )
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

  it('leaves no alarm or next run when auto-export is disabled while a run is in flight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    const runPromise = runAutoExport('scheduled')
    await vi.waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1))
    await autoExportConfigStore.setValue(
      baseConfig({ enabled: false, formats: ['html'] }),
    )
    await syncAlarm('config-change')
    completeAll()
    await runPromise

    expect(await autoExportNextRunStore.getValue()).toBeNull()
    expect(await browser.alarms.get(ALARM_NAME)).toBeUndefined()
  })

  it('uses the fresh interval when it changes while a run is in flight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    const runPromise = runAutoExport('scheduled')
    await vi.waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(1))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1h' }),
    )
    completeAll()
    await runPromise

    const nextRun = await autoExportNextRunStore.getValue()
    expect(nextRun).toBeGreaterThanOrEqual(
      new Date(2024, 5, 1, 9, 0, 0, 0).getTime(),
    )
    expect(nextRun).toBeLessThan(new Date(2024, 5, 1, 9, 0, 5, 0).getTime())
    const alarm = await browser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBe(nextRun)
  })

  it('does not reschedule the next run after a manual run', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 8, 0, 0, 0))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '10:00' }),
    )
    await autoExportNextRunStore.setValue(null)
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'manual')

    expect(await autoExportNextRunStore.getValue()).toBeNull()
  })

  it('sets autoExportLastRunStore only after every selected download resolves', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
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

    const { mock: downloadSpy, fire } = mockDownload()

    const runPromise = runAutoExport('scheduled')

    await vi.waitFor(() => expect(downloadSpy).toHaveBeenCalledTimes(2))
    expect(await autoExportLastRunStore.getValue()).toBeNull()

    fire(1, 'complete')
    await vi.waitFor(() =>
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('blob:') }),
      ),
    )
    expect(await autoExportLastRunStore.getValue()).toBeNull()

    fire(2, 'complete')
    await runPromise

    expect(await autoExportLastRunStore.getValue()).toEqual({
      at: Date.now(),
      ok: true,
      trigger: 'scheduled',
    })
  })
})

function mockCleanup() {
  const removeFile = vi.fn<(id: number) => Promise<void>>(async () => {})
  const erase = vi.fn<(query: { id: number }) => Promise<number[]>>(
    async () => [],
  )
  const search = vi.fn(async ({ id }: { id: number }) => [
    { id, byExtensionId: browser.runtime.id },
  ])
  browser.downloads.search =
    search as unknown as typeof browser.downloads.search
  browser.downloads.removeFile =
    removeFile as unknown as typeof browser.downloads.removeFile
  browser.downloads.erase = erase as unknown as typeof browser.downloads.erase
  return { removeFile, erase }
}

async function runOnce(expectedDownloads: number) {
  const { mock, completeAll } = mockDownload()
  await runAutoExportAndSettle(mock, completeAll, expectedDownloads)
}

describe('runAutoExport retention', () => {
  it('records the ids of saved files and removes whole runs beyond keepLast after a successful run', async () => {
    await autoExportConfigStore.setValue(baseConfig({ keepLast: 2 }))
    await autoExportDownloadIdsStore.setValue([
      { runAt: 1, ids: [100] },
      { runAt: 2, ids: [101] },
      { runAt: 3, ids: [102] },
    ])
    const { removeFile, erase } = mockCleanup()

    await runOnce(1)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([100, 101])
    expect(erase).toHaveBeenCalledTimes(2)
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 3, ids: [102] },
      { runAt: expect.any(Number), ids: [1] },
    ])
  })

  it('keeps every format file of the last keepLast runs with several formats', async () => {
    await autoExportConfigStore.setValue(
      baseConfig({ keepLast: 2, formats: ['html', 'json', 'csv'] }),
    )
    await autoExportDownloadIdsStore.setValue([
      { runAt: 1, ids: [100, 101, 102] },
      { runAt: 2, ids: [103, 104, 105] },
    ])
    const { removeFile } = mockCleanup()

    await runOnce(3)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([100, 101, 102])
    const stored = await autoExportDownloadIdsStore.getValue()
    expect(stored.map((run) => run.ids.length)).toEqual([3, 3])
  })

  it('keeps everything when keepLast is 0', async () => {
    await autoExportConfigStore.setValue(baseConfig({ keepLast: 0 }))
    await autoExportDownloadIdsStore.setValue([
      { runAt: 1, ids: [100] },
      { runAt: 2, ids: [101] },
    ])
    const { removeFile } = mockCleanup()

    await runOnce(1)

    expect(removeFile).not.toHaveBeenCalled()
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 1, ids: [100] },
      { runAt: 2, ids: [101] },
      { runAt: expect.any(Number), ids: [1] },
    ])
  })

  it('never deletes anything when the run fails', async () => {
    await autoExportConfigStore.setValue(baseConfig({ keepLast: 1 }))
    await autoExportDownloadIdsStore.setValue([
      { runAt: 1, ids: [100] },
      { runAt: 2, ids: [101] },
    ])
    mockActionBadge()
    const { removeFile } = mockCleanup()
    const { mock, fire } = mockDownload()

    const runPromise = runAutoExport('scheduled')
    const settled = Promise.allSettled([runPromise])
    await vi.waitFor(() => expect(mock).toHaveBeenCalledTimes(1))
    fire(1, 'interrupted')
    const [result] = await settled
    expect(result?.status).toBe('rejected')

    expect(removeFile).not.toHaveBeenCalled()
  })

  it('does not fail the run when a file to remove is already gone', async () => {
    await autoExportConfigStore.setValue(baseConfig({ keepLast: 1 }))
    await autoExportDownloadIdsStore.setValue([
      { runAt: 1, ids: [100] },
      { runAt: 2, ids: [101] },
    ])
    const { removeFile } = mockCleanup()
    removeFile.mockRejectedValueOnce(new Error('Download file missing.'))

    await runOnce(1)

    expect(removeFile).toHaveBeenCalledTimes(2)
    expect(await autoExportLastRunStore.getValue()).toMatchObject({ ok: true })
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: expect.any(Number), ids: [1] },
    ])
  })

  it('tracks a download that times out so retention can still remove it later', async () => {
    vi.useFakeTimers()
    try {
      await autoExportConfigStore.setValue(baseConfig({ keepLast: 1 }))
      mockActionBadge()
      mockNotifications()
      mockCleanup()
      const { mock } = mockDownload()

      const runPromise = runAutoExport('scheduled')
      const settled = Promise.allSettled([runPromise])
      await vi.waitFor(() => expect(mock).toHaveBeenCalledTimes(1))
      await vi.advanceTimersByTimeAsync(DOWNLOAD_SETTLE_TIMEOUT_MS)
      await settled

      expect(await autoExportLastRunStore.getValue()).toMatchObject({
        ok: false,
        error: 'Download 1 timed out.',
      })
      expect(await autoExportDownloadIdsStore.getValue()).toEqual([
        { runAt: expect.any(Number), ids: [1] },
      ])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('computeNextRunAfterDue', () => {
  it('schedules today at the preferred time for a 1d run that fires after midnight', () => {
    const due = new Date(2024, 5, 1, 23, 0).getTime()
    const now = new Date(2024, 5, 2, 0, 30).getTime()
    expect(computeNextRunAfterDue('1d', '23:00', due, now)).toBe(
      new Date(2024, 5, 2, 23, 0).getTime(),
    )
  })

  it('schedules a full day out for an on-time 1d run', () => {
    const due = new Date(2024, 5, 1, 23, 0).getTime()
    expect(computeNextRunAfterDue('1d', '23:00', due, due + 500)).toBe(
      new Date(2024, 5, 2, 23, 0).getTime(),
    )
  })

  it('keeps a 3d run on its three-day cadence when it fires late', () => {
    const due = new Date(2024, 5, 1, 23, 0).getTime()
    const now = new Date(2024, 5, 2, 0, 30).getTime()
    expect(computeNextRunAfterDue('3d', '23:00', due, now)).toBe(
      new Date(2024, 5, 4, 23, 0).getTime(),
    )
  })

  it('keeps a weekly run on its weekday when it fires late', () => {
    const due = new Date(2024, 5, 3, 23, 0).getTime()
    const now = new Date(2024, 5, 4, 0, 30).getTime()
    expect(computeNextRunAfterDue('7d', '23:00', due, now, 1)).toBe(
      new Date(2024, 5, 10, 23, 0).getTime(),
    )
  })

  it('skips missed occurrences when the due time is far in the past', () => {
    const due = new Date(2024, 5, 1, 23, 0).getTime()
    const now = new Date(2024, 5, 9, 12, 0).getTime()
    expect(computeNextRunAfterDue('1d', '23:00', due, now)).toBe(
      new Date(2024, 5, 9, 23, 0).getTime(),
    )
  })

  it('keeps the wall-clock time across a DST transition day', () => {
    const due = new Date(2024, 2, 9, 23, 0).getTime()
    const now = new Date(2024, 2, 10, 0, 30).getTime()
    const next = new Date(computeNextRunAfterDue('1d', '23:00', due, now))
    expect(next.getDate()).toBe(10)
    expect(next.getHours()).toBe(23)
    expect(next.getMinutes()).toBe(0)
  })

  it('keeps hourly intervals one interval after now', () => {
    const now = new Date(2024, 5, 1, 8, 0).getTime()
    expect(computeNextRunAfterDue('1h', '00:00', now - 5000, now)).toBe(
      now + 60 * 60 * 1000,
    )
  })
})

describe('runAutoExport scheduling resilience', () => {
  it('schedules the next 23:00 when a scheduled run fires late', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const due = new Date(2024, 5, 1, 23, 0).getTime()
    vi.setSystemTime(new Date(2024, 5, 2, 0, 30))
    await autoExportConfigStore.setValue(
      baseConfig({ formats: ['html'], interval: '1d', preferredTime: '23:00' }),
    )
    await autoExportNextRunStore.setValue(due)
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'scheduled')

    expect(await autoExportNextRunStore.getValue()).toBe(
      new Date(2024, 5, 2, 23, 0).getTime(),
    )
  })

  it('leaves a retry alarm when a run is killed mid-flight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2024, 5, 1, 23, 0))
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    const { mock: downloadSpy } = mockDownload()
    mockActionBadge()

    void runAutoExport('scheduled').catch(() => {})
    await vi.waitFor(() => expect(downloadSpy).toHaveBeenCalled())

    const alarm = await browser.alarms.get(ALARM_NAME)
    expect(alarm).toBeDefined()
    expect(alarm?.scheduledTime).toBeGreaterThan(Date.now())
  })

  it('skips a scheduled run while another run is in flight', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    await autoExportRunInFlightStore.setValue(Date.now())
    const { mock: downloadSpy } = mockDownload()

    await runAutoExport('catch-up')

    expect(downloadSpy).not.toHaveBeenCalled()
  })

  it('ignores a stale in-flight marker', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    await autoExportRunInFlightStore.setValue(Date.now() - 60 * 60 * 1000)
    const { mock: downloadSpy, completeAll } = mockDownload()
    mockActionBadge()

    await runAutoExportAndSettle(downloadSpy, completeAll, 1, 'scheduled')

    expect(await autoExportRunInFlightStore.getValue()).toBeNull()
  })

  it('arms the retry alarm instead of a catch-up at startup while a run is in flight', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    await autoExportNextRunStore.setValue(Date.now() - 1000)
    const startedAt = Date.now()
    await autoExportRunInFlightStore.setValue(startedAt)

    await syncAlarm('startup')

    const alarm = await browser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBeGreaterThan(startedAt + 10 * 60_000)
  })

  it('keeps the retry alarm when a skipped run finds another one in flight', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: ['html'] }))
    const startedAt = Date.now()
    await autoExportRunInFlightStore.setValue(startedAt)
    const { mock: downloadSpy } = mockDownload()

    await runAutoExport('catch-up')

    expect(downloadSpy).not.toHaveBeenCalled()
    const alarm = await browser.alarms.get(ALARM_NAME)
    expect(alarm?.scheduledTime).toBeGreaterThan(startedAt + 10 * 60_000)
  })
})
