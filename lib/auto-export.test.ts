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
 */
async function runAutoExportAndSettle(
  downloadSpy: ReturnType<typeof mockDownload>['mock'],
  completeAll: () => void,
  expectedDownloadCount: number,
): Promise<void> {
  const runPromise = runAutoExport()
  await vi.waitFor(() =>
    expect(downloadSpy).toHaveBeenCalledTimes(expectedDownloadCount),
  )
  completeAll()
  await runPromise
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
    const { mock: downloadSpy } = mockDownload()

    await runAutoExport()

    expect(downloadSpy).not.toHaveBeenCalled()
    expect(await autoExportLastRunStore.getValue()).toBeNull()
  })

  it('no-ops when no format is selected', async () => {
    await autoExportConfigStore.setValue(baseConfig({ formats: [] }))
    const { mock: downloadSpy } = mockDownload()

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

  it('sets autoExportLastRunStore only after every selected download settles', async () => {
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

    const { mock: downloadSpy, fire } = mockDownload()

    const runPromise = runAutoExport()

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

    expect(await autoExportLastRunStore.getValue()).toBe(Date.now())
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
})
