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
import { CREATE_BLOB_URL_MESSAGE_TYPE } from './offscreen-download'

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
