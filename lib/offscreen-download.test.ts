// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { resetFakeI18n } from '@/lib/testing/fake-i18n'

import {
  CREATE_BLOB_URL_MESSAGE_TYPE,
  DOWNLOAD_SETTLE_TIMEOUT_MS,
  downloadViaOffscreenDocument,
  OFFSCREEN_DOCUMENT_PATH,
  REVOKE_BLOB_URL_MESSAGE_TYPE,
} from './offscreen-download'

type OnChangedListener = (delta: Browser.downloads.DownloadDelta) => void

/**
 * Replaces `chrome.offscreen` (unimplemented in `fakeBrowser`) with `vi.fn`
 * stubs for `createDocument`/`closeDocument`, and `chrome.runtime.getContexts`.
 * @param existingContexts What `getContexts` reports as already open.
 * @returns The installed mocks, for call-count/call-args assertions.
 */
function mockOffscreenApi(existingContexts: unknown[] = []) {
  let isOpen = existingContexts.length > 0
  const createDocument = vi.fn(async () => {
    isOpen = true
  })
  const closeDocument = vi.fn(async () => {
    isOpen = false
  })
  const getContexts = vi.fn(async () =>
    isOpen ? [{ contextType: 'OFFSCREEN_DOCUMENT' }] : [],
  )
  chrome.offscreen = {
    createDocument,
    closeDocument,
  } as unknown as typeof chrome.offscreen
  chrome.runtime.getContexts =
    getContexts as unknown as typeof chrome.runtime.getContexts
  function closeFromAnotherContext(): void {
    isOpen = false
  }
  return { createDocument, closeDocument, getContexts, closeFromAnotherContext }
}

/**
 * Replaces `browser.runtime.sendMessage` (unimplemented in `fakeBrowser`)
 * with a `vi.fn` that answers `CREATE_BLOB_URL_MESSAGE_TYPE` with a
 * unique, incrementing mock blob URL, and acknowledges every other message.
 * @returns The installed mock, for call-count/call-args assertions.
 */
function mockRuntimeSendMessage() {
  let counter = 0
  const mock = vi.fn(async (message: { type: string }) => {
    if (message.type === CREATE_BLOB_URL_MESSAGE_TYPE) {
      counter += 1
      return { url: `blob:mock-${counter}` }
    }
    return
  })
  browser.runtime.sendMessage =
    mock as unknown as typeof browser.runtime.sendMessage
  return mock
}

/**
 * Replaces `browser.downloads.download` and `browser.downloads.onChanged`
 * (unimplemented in `fakeBrowser`) with `vi.fn` stubs: `download` resolves
 * with incrementing ids, and `fire` dispatches an `onChanged` event to every
 * currently-registered listener so a test can simulate a download reaching
 * `'complete'`/`'interrupted'`.
 * @returns The installed mocks plus a `fire` helper.
 */
function mockDownloadsApi() {
  let nextId = 1
  const download = vi.fn(async () => nextId++)
  const listeners: OnChangedListener[] = []
  const addListener = vi.fn((listener: OnChangedListener) => {
    listeners.push(listener)
  })
  const removeListener = vi.fn((listener: OnChangedListener) => {
    const index = listeners.indexOf(listener)
    if (index !== -1) listeners.splice(index, 1)
  })

  browser.downloads.download = download as typeof browser.downloads.download
  browser.downloads.onChanged.addListener =
    addListener as typeof browser.downloads.onChanged.addListener
  browser.downloads.onChanged.removeListener =
    removeListener as typeof browser.downloads.onChanged.removeListener

  function fire(id: number, state: 'complete' | 'interrupted'): void {
    for (const listener of listeners) {
      listener({
        id,
        state: { current: state },
      } as Browser.downloads.DownloadDelta)
    }
  }

  return { download, addListener, removeListener, fire }
}

/**
 * Flushes pending microtasks so promise chains inside
 * `downloadViaOffscreenDocument` (which never use a real timer) settle up to
 * the point where they're waiting on an event this test must trigger.
 * @param times How many microtask ticks to flush.
 */
async function flushMicrotasks(times = 30): Promise<void> {
  for (let index = 0; index < times; index++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeI18n()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('downloadViaOffscreenDocument', () => {
  it('reuses a leftover offscreen document found via getContexts instead of creating one', async () => {
    const offscreen = mockOffscreenApi([{ contextType: 'OFFSCREEN_DOCUMENT' }])
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument('c', 'text/plain', 'f.txt')
    await flushMicrotasks()
    downloads.fire(1, 'complete')
    await runPromise

    expect(offscreen.getContexts).toHaveBeenCalledWith({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    })
    expect(offscreen.createDocument).not.toHaveBeenCalled()
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1)
  })

  it('resolves when the download already completed before the listener attached', async () => {
    mockOffscreenApi()
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()
    const downloadsApi = browser.downloads as unknown as { search: unknown }
    const originalSearch = downloadsApi.search
    downloadsApi.search = vi.fn(() =>
      Promise.resolve([{ id: 1, state: 'complete' }]),
    )
    onTestFinished(() => {
      downloadsApi.search = originalSearch
    })

    const downloadId = await downloadViaOffscreenDocument(
      'c',
      'text/plain',
      'f.txt',
    )

    expect(downloadId).toBe(1)
    expect(downloads.removeListener).toHaveBeenCalledTimes(1)
  })

  it('reports the download id as soon as it starts, before it settles', async () => {
    mockOffscreenApi()
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()
    const onDownloadStarted = vi.fn()

    const runPromise = downloadViaOffscreenDocument(
      'c',
      'text/plain',
      'f.txt',
      onDownloadStarted,
    )
    await flushMicrotasks()

    expect(onDownloadStarted).toHaveBeenCalledExactlyOnceWith(1)
    downloads.fire(1, 'complete')
    await runPromise
  })

  it('rejects with a localized message on timeout but keeps the blob URL alive until the download settles', async () => {
    vi.useFakeTimers()
    try {
      const offscreen = mockOffscreenApi()
      const sendMessage = mockRuntimeSendMessage()
      const downloads = mockDownloadsApi()
      const onDownloadStarted = vi.fn()

      const settled = Promise.allSettled([
        downloadViaOffscreenDocument(
          'c',
          'text/plain',
          'f.txt',
          onDownloadStarted,
        ),
      ])
      await vi.advanceTimersByTimeAsync(DOWNLOAD_SETTLE_TIMEOUT_MS)
      const [outcome] = await settled
      expect(outcome.status).toBe('rejected')
      expect((outcome as PromiseRejectedResult).reason).toEqual(
        new Error('Download 1 timed out.'),
      )
      expect(onDownloadStarted).toHaveBeenCalledWith(1)

      const revokeCalls = () =>
        sendMessage.mock.calls.filter(
          ([message]) => message.type === REVOKE_BLOB_URL_MESSAGE_TYPE,
        )
      expect(revokeCalls()).toHaveLength(0)
      expect(offscreen.closeDocument).not.toHaveBeenCalled()

      downloads.fire(1, 'complete')
      await vi.advanceTimersByTimeAsync(0)

      expect(revokeCalls()).toHaveLength(1)
      expect(offscreen.closeDocument).toHaveBeenCalledTimes(1)
      expect(downloads.removeListener).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('also revokes a timed-out download once it is interrupted', async () => {
    vi.useFakeTimers()
    try {
      mockOffscreenApi()
      const sendMessage = mockRuntimeSendMessage()
      const downloads = mockDownloadsApi()

      const settled = Promise.allSettled([
        downloadViaOffscreenDocument('c', 'text/plain', 'f.txt'),
      ])
      await vi.advanceTimersByTimeAsync(DOWNLOAD_SETTLE_TIMEOUT_MS)
      await settled
      downloads.fire(1, 'interrupted')
      await vi.advanceTimersByTimeAsync(0)

      expect(
        sendMessage.mock.calls.filter(
          ([message]) => message.type === REVOKE_BLOB_URL_MESSAGE_TYPE,
        ),
      ).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('creates the offscreen document when none is open', async () => {
    const offscreen = mockOffscreenApi()
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument(
      'content',
      'text/plain',
      'file.txt',
    )
    await flushMicrotasks()
    downloads.fire(1, 'complete')
    await runPromise

    expect(offscreen.createDocument).toHaveBeenCalledTimes(1)
    expect(offscreen.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(OFFSCREEN_DOCUMENT_PATH),
        reasons: ['BLOBS'],
      }),
    )
  })

  it('reuses an already-open offscreen document across concurrent downloads in one run', async () => {
    const offscreen = mockOffscreenApi()
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const first = downloadViaOffscreenDocument('a', 'text/plain', 'a.txt')
    const second = downloadViaOffscreenDocument('b', 'text/plain', 'b.txt')

    await flushMicrotasks()
    downloads.fire(1, 'complete')
    downloads.fire(2, 'complete')

    await Promise.all([first, second])

    expect(offscreen.createDocument).toHaveBeenCalledTimes(1)
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1)
  })

  it('creates a new offscreen document again for a later, separate run', async () => {
    const offscreen = mockOffscreenApi()
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const firstRun = downloadViaOffscreenDocument('a', 'text/plain', 'a.txt')
    await flushMicrotasks()
    downloads.fire(1, 'complete')
    await firstRun

    const secondRun = downloadViaOffscreenDocument('b', 'text/plain', 'b.txt')
    await flushMicrotasks()
    downloads.fire(2, 'complete')
    await secondRun

    expect(offscreen.createDocument).toHaveBeenCalledTimes(2)
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(2)
  })

  it('revokes the object URL and closes the offscreen document once the download completes', async () => {
    const offscreen = mockOffscreenApi()
    const sendMessage = mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument(
      'content',
      'text/plain',
      'file.txt',
    )
    await flushMicrotasks()
    downloads.fire(1, 'complete')
    await runPromise

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: REVOKE_BLOB_URL_MESSAGE_TYPE,
        url: 'blob:mock-1',
      }),
    )
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1)
  })

  it('revokes the object URL and closes the offscreen document when the download is interrupted', async () => {
    const offscreen = mockOffscreenApi()
    const sendMessage = mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument(
      'content',
      'text/plain',
      'file.txt',
    )
    await flushMicrotasks()
    downloads.fire(1, 'interrupted')

    await expect(runPromise).rejects.toThrow(/interrupted/i)

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: REVOKE_BLOB_URL_MESSAGE_TYPE,
        url: 'blob:mock-1',
      }),
    )
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1)
  })

  it('propagates an error when creating the offscreen document fails', async () => {
    const createDocument = vi.fn(async () => {
      throw new Error('offscreen creation failed')
    })
    const closeDocument = vi.fn(async () => {})
    chrome.offscreen = {
      createDocument,
      closeDocument,
    } as unknown as typeof chrome.offscreen
    chrome.runtime.getContexts = vi.fn(
      async () => [],
    ) as unknown as typeof chrome.runtime.getContexts
    mockRuntimeSendMessage()
    mockDownloadsApi()

    await expect(
      downloadViaOffscreenDocument('content', 'text/plain', 'file.txt'),
    ).rejects.toThrow('offscreen creation failed')

    expect(closeDocument).not.toHaveBeenCalled()
  })

  it('propagates an error when the download call fails', async () => {
    mockOffscreenApi()
    const sendMessage = mockRuntimeSendMessage()
    const download = vi.fn(async () => {
      throw new Error('download failed')
    })
    browser.downloads.download = download as typeof browser.downloads.download
    browser.downloads.onChanged.addListener =
      vi.fn() as typeof browser.downloads.onChanged.addListener
    browser.downloads.onChanged.removeListener =
      vi.fn() as typeof browser.downloads.onChanged.removeListener

    await expect(
      downloadViaOffscreenDocument('content', 'text/plain', 'file.txt'),
    ).rejects.toThrow('download failed')

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: REVOKE_BLOB_URL_MESSAGE_TYPE,
        url: 'blob:mock-1',
      }),
    )
  })

  it('does not close the offscreen document out from under a slower concurrent download', async () => {
    const offscreen = mockOffscreenApi()
    const downloads = mockDownloadsApi()

    const { promise: bGate, resolve: releaseB } = Promise.withResolvers<void>()
    const sendMessage = vi.fn(
      async (message: { type: string; content?: string }) => {
        if (message.type !== CREATE_BLOB_URL_MESSAGE_TYPE) return
        if (message.content === 'b') {
          await bGate
          return { url: 'blob:mock-b' }
        }
        return { url: 'blob:mock-a' }
      },
    )
    browser.runtime.sendMessage =
      sendMessage as unknown as typeof browser.runtime.sendMessage

    const a = downloadViaOffscreenDocument('a', 'text/plain', 'a.txt')
    const b = downloadViaOffscreenDocument('b', 'text/plain', 'b.txt')

    await flushMicrotasks()
    downloads.fire(1, 'complete')
    await a

    expect(offscreen.closeDocument).not.toHaveBeenCalled()

    releaseB()
    await flushMicrotasks()
    downloads.fire(2, 'complete')
    await b

    expect(offscreen.createDocument).toHaveBeenCalledTimes(1)
    expect(offscreen.closeDocument).toHaveBeenCalledTimes(1)
  })

  it('still resolves with the download id when revoking the object URL fails', async () => {
    mockOffscreenApi()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === CREATE_BLOB_URL_MESSAGE_TYPE) {
        return { url: 'blob:mock-1' }
      }
      throw new Error('Could not establish connection')
    })
    browser.runtime.sendMessage =
      sendMessage as unknown as typeof browser.runtime.sendMessage
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument('c', 'text/plain', 'f.txt')
    await flushMicrotasks()
    downloads.fire(1, 'complete')

    await expect(runPromise).resolves.toBe(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('treats a concurrent "single offscreen document" createDocument error as already open', async () => {
    const offscreen = mockOffscreenApi()
    offscreen.createDocument.mockRejectedValueOnce(
      new Error('Only a single offscreen document may be created.'),
    )
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument('c', 'text/plain', 'f.txt')
    await flushMicrotasks()
    downloads.fire(1, 'complete')

    await expect(runPromise).resolves.toBe(1)
  })

  it('recreates the document when another context closed it while a download was in flight', async () => {
    const offscreen = mockOffscreenApi()
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const first = downloadViaOffscreenDocument('a', 'text/plain', 'a.txt')
    await flushMicrotasks()
    offscreen.closeFromAnotherContext()
    const second = downloadViaOffscreenDocument('b', 'text/plain', 'b.txt')
    await flushMicrotasks()

    expect(offscreen.createDocument).toHaveBeenCalledTimes(2)
    downloads.fire(1, 'complete')
    downloads.fire(2, 'complete')
    await Promise.all([first, second])
  })

  it('does not fail a successful download when closing the document fails', async () => {
    const offscreen = mockOffscreenApi()
    offscreen.closeDocument.mockRejectedValueOnce(new Error('No document'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRuntimeSendMessage()
    const downloads = mockDownloadsApi()

    const runPromise = downloadViaOffscreenDocument('c', 'text/plain', 'f.txt')
    await flushMicrotasks()
    downloads.fire(1, 'complete')

    await expect(runPromise).resolves.toBe(1)
  })
})
