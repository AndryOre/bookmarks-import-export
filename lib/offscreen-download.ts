import type { Browser } from '@wxt-dev/browser'

/**
 * Relative URL of the offscreen document created by
 * {@link downloadViaOffscreenDocument}, served by the `entrypoints/offscreen`
 * unlisted entrypoint.
 */
export const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html'

/**
 * How long {@link downloadViaOffscreenDocument} waits for a download to reach
 * `'complete'` or `'interrupted'` before giving up.
 */
export const DOWNLOAD_SETTLE_TIMEOUT_MS = 60_000

/**
 * Message type asking the offscreen document to turn export content into a
 * `Blob` object URL.
 */
export const CREATE_BLOB_URL_MESSAGE_TYPE = 'auto-export-create-blob-url'

/**
 * Message type asking the offscreen document to revoke a previously created
 * object URL.
 */
export const REVOKE_BLOB_URL_MESSAGE_TYPE = 'auto-export-revoke-blob-url'

/**
 * Sent to the offscreen document to request a `Blob` object URL.
 */
export interface CreateBlobUrlMessage {
  type: typeof CREATE_BLOB_URL_MESSAGE_TYPE
  content: string
  mimeType: string
}

/**
 * Sent to the offscreen document to revoke a `Blob` object URL.
 */
export interface RevokeBlobUrlMessage {
  type: typeof REVOKE_BLOB_URL_MESSAGE_TYPE
  url: string
}

/**
 * Reply to a {@link CreateBlobUrlMessage}.
 */
export interface CreateBlobUrlResponse {
  url: string
}

/**
 * Mutable offscreen-document lifecycle state, grouped in one object (instead
 * of top-level `let` bindings reassigned from inside a function). The
 * offscreen document itself is browser-wide, but this state is per JS
 * context (the service worker and the App page each have their own), so
 * `documentOpened` is only a hint that this context opened or reused the
 * document — {@link ensureOffscreenDocument} always re-checks `getContexts`
 * rather than trusting it. `lifecycle` serializes every create/close call
 * within this context onto a single promise chain so a close triggered by one
 * download settling can never run concurrently with a create triggered by
 * another — see {@link ensureOffscreenDocument} and
 * {@link closeOffscreenDocumentIfIdle}.
 */
const offscreenState: {
  documentOpened: boolean
  pendingDownloads: number
  lifecycle: Promise<void>
} = {
  documentOpened: false,
  pendingDownloads: 0,
  lifecycle: Promise.resolve(),
}

/**
 * Chains `step` onto {@link offscreenState}'s `lifecycle` promise so it runs
 * only after every previously queued create/close step has fully settled —
 * a create can never start while a close is still in flight, or vice versa.
 * Swaps `lifecycle` to a new gate *synchronously*, before awaiting anything,
 * so two steps queued back to back in the same tick (as a run's concurrent
 * format downloads do) still serialize correctly rather than both reading
 * the same "previous" promise. `lifecycle` itself never rejects (a step's
 * own rejection is swallowed for chaining purposes, though it still
 * propagates to this call's own caller) — otherwise one step's failure
 * would wedge every step queued after it.
 * @param step The create or close step to serialize.
 * @returns `step`'s own result.
 */
async function runLifecycleStep<T>(step: () => Promise<T>): Promise<T> {
  const previous = offscreenState.lifecycle
  const { promise: gate, resolve: releaseGate } = Promise.withResolvers<void>()
  offscreenState.lifecycle = gate

  try {
    await previous
  } catch {}
  try {
    return await step()
  } finally {
    releaseGate()
  }
}

/**
 * Whether `error` is Chrome's rejection for creating a second offscreen
 * document, which happens when another JS context created one between this
 * context's `getContexts` check and its `createDocument` call.
 * @param error The rejection from `chrome.offscreen.createDocument`.
 * @returns `true` if the document already exists.
 */
function isOffscreenAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('Only a single offscreen document may be created')
}

/**
 * Opens the offscreen document, reusing one Chrome still has open (from a
 * previous service worker lifetime or another JS context — the document is
 * browser-wide, and a second `createDocument` would reject). A concurrent
 * creation by another context that wins the race is treated as "already
 * exists" rather than surfaced.
 * @returns Resolves once an offscreen document is open.
 */
async function openOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  })
  if (existingContexts.length > 0) return

  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH),
      reasons: ['BLOBS'],
      justification:
        'Create Blob object URLs for exported bookmark files too large for a data URL.',
    })
  } catch (error) {
    if (!isOffscreenAlreadyExistsError(error)) throw error
  }
}

/**
 * Ensures an offscreen document is open, re-checking `getContexts` on every
 * call (via {@link openOffscreenDocument}) so a document another JS context
 * closed since this context last used it is recreated instead of assumed
 * present. Chained onto {@link offscreenState}'s `lifecycle` promise so it
 * never runs concurrently with {@link closeOffscreenDocumentIfIdle}.
 * @returns Resolves once the offscreen document is open.
 */
async function ensureOffscreenDocument(): Promise<void> {
  await runLifecycleStep(async () => {
    await openOffscreenDocument()
    offscreenState.documentOpened = true
  })
}

/**
 * Closes the offscreen document once every download started in this context
 * has settled, so a run exporting multiple formats reuses a single document
 * instead of opening and closing one per file. Chained onto
 * {@link offscreenState}'s `lifecycle` promise so it never runs concurrently
 * with {@link ensureOffscreenDocument}, and re-checks `pendingDownloads` at
 * the time it actually runs (not when it was called) in case another
 * download started in the meantime. A close failure (for example another
 * context already closed the document) is logged, never thrown, so it can't
 * fail a download that already succeeded.
 * @returns Resolves once the document is closed, or immediately if another download is pending or none is open.
 */
async function closeOffscreenDocumentIfIdle(): Promise<void> {
  await runLifecycleStep(async () => {
    if (offscreenState.pendingDownloads > 0 || !offscreenState.documentOpened)
      return
    offscreenState.documentOpened = false
    try {
      await chrome.offscreen.closeDocument()
    } catch (error) {
      console.error('Failed to close the offscreen document.', error)
    }
  })
}

/**
 * Asks the offscreen document to wrap `content` in a `Blob` and return an
 * object URL for it — the offscreen document context has the `URL`/`Blob`
 * registry the service worker lacks.
 * @param content The export content to wrap.
 * @param mimeType The content's MIME type.
 * @returns The resulting `Blob` object URL.
 */
async function requestBlobUrl(
  content: string,
  mimeType: string,
): Promise<string> {
  const message: CreateBlobUrlMessage = {
    type: CREATE_BLOB_URL_MESSAGE_TYPE,
    content,
    mimeType,
  }
  const response = (await browser.runtime.sendMessage(
    message,
  )) as CreateBlobUrlResponse
  return response.url
}

/**
 * Asks the offscreen document to revoke a previously created object URL.
 * @param url The object URL to revoke.
 * @returns Resolves once the offscreen document has revoked the URL.
 */
async function revokeBlobUrl(url: string): Promise<void> {
  const message: RevokeBlobUrlMessage = {
    type: REVOKE_BLOB_URL_MESSAGE_TYPE,
    url,
  }
  await browser.runtime.sendMessage(message)
}

async function readDownloadState(
  downloadId: number,
): Promise<string | undefined> {
  try {
    const [item] = await browser.downloads.search({ id: downloadId })
    return item?.state
  } catch {
    return
  }
}

/**
 * Resolves once `downloadId` reaches a terminal `browser.downloads.onChanged`
 * state, rejects if it is interrupted, or rejects after
 * {@link DOWNLOAD_SETTLE_TIMEOUT_MS} if it never settles. Always removes its
 * listener and timer when it settles. A download that already settled before
 * the listener attached is picked up by a one-off `downloads.search`.
 * @param downloadId The download to watch.
 * @returns Resolves on `'complete'`, rejects on `'interrupted'` or timeout.
 */
function waitForDownloadSettled(downloadId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timeoutHandle)
      browser.downloads.onChanged.removeListener(listener)
    }
    const settle = (state: string | undefined): void => {
      if (state === 'complete') {
        cleanup()
        resolve()
      } else if (state === 'interrupted') {
        cleanup()
        const message = i18n.t('downloadInterrupted', [String(downloadId)])
        reject(new Error(message))
      }
    }
    const listener = (delta: Browser.downloads.DownloadDelta): void => {
      if (delta.id !== downloadId) return
      settle(delta.state?.current)
    }
    const timeoutHandle = setTimeout(() => {
      cleanup()
      reject(new Error(`Download ${downloadId} timed out.`))
    }, DOWNLOAD_SETTLE_TIMEOUT_MS)
    browser.downloads.onChanged.addListener(listener)
    void readDownloadState(downloadId).then(settle)
  })
}

/**
 * Downloads `content` via a shared offscreen document instead of a base64
 * data URL, so exports aren't capped by the data-URL size limit. The content still
 * travels through `runtime.sendMessage`, which caps it at 64 MiB. Creates
 * the offscreen document on first use (or reuses one already open from a
 * concurrent call in the same run), messages it to obtain a `Blob` object
 * URL, downloads that URL with `saveAs: false` and `conflictAction:
 * 'uniquify'`, and — once the download reaches `'complete'` or
 * `'interrupted'` — revokes the object URL and closes the offscreen document
 * if no other download from this run is still pending.
 * @param content The export content to download.
 * @param mimeType The content's MIME type.
 * @param filename The downloads-relative filename to save it as.
 * @returns Resolves with the completed download's id once it has settled and cleanup has run.
 */
export async function downloadViaOffscreenDocument(
  content: string,
  mimeType: string,
  filename: string,
): Promise<number> {
  offscreenState.pendingDownloads += 1
  try {
    await ensureOffscreenDocument()
    const url = await requestBlobUrl(content, mimeType)

    try {
      const downloadId = await browser.downloads.download({
        url,
        filename,
        saveAs: false,
        conflictAction: 'uniquify',
      })

      await waitForDownloadSettled(downloadId)
      return downloadId
    } finally {
      try {
        await revokeBlobUrl(url)
      } catch (error) {
        console.error('Failed to revoke the export blob URL.', error)
      }
    }
  } finally {
    offscreenState.pendingDownloads -= 1
    await closeOffscreenDocumentIfIdle()
  }
}
