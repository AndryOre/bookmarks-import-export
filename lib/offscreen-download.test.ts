// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  CREATE_BLOB_URL_MESSAGE_TYPE,
  downloadViaOffscreenDocument,
  OFFSCREEN_DOCUMENT_PATH,
  REVOKE_BLOB_URL_MESSAGE_TYPE,
} from './offscreen-download'

type OnChangedListener = (delta: Browser.downloads.DownloadDelta) => void

/**
 * Replaces `chrome.offscreen` (unimplemented in `fakeBrowser`) with `vi.fn`
 * stubs for `createDocument`/`closeDocument`.
 * @returns The installed mocks, for call-count/call-args assertions.
 */
function mockOffscreenApi() {
  const createDocument = vi.fn(async () => {})
  const closeDocument = vi.fn(async () => {})
  chrome.offscreen = {
    createDocument,
    closeDocument,
  } as unknown as typeof chrome.offscreen
  return { createDocument, closeDocument }
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
async function flushMicrotasks(times = 10): Promise<void> {
  for (let index = 0; index < times; index++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  fakeBrowser.reset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('downloadViaOffscreenDocument', () => {
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
})
