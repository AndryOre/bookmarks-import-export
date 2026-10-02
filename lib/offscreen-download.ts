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
 * of top-level `let` bindings reassigned from inside a function) so it's
 * open-once-per-run/closed-once-idle across concurrent downloads.
 * `lifecycle` serializes every create/close call onto a single promise chain
 * so a close triggered by one download settling can never run concurrently
 * with a create triggered by another — see {@link ensureOffscreenDocument}
 * and {@link closeOffscreenDocumentIfIdle}.
 */
const offscreenState: {
  openDocumentPromise: Promise<void> | null
  pendingDownloads: number
  lifecycle: Promise<void>
} = {
  openDocumentPromise: null,
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
 * Opens the offscreen document, reusing one Chrome still has open from a
 * previous service worker lifetime (the in-memory state is lost when the
 * worker is killed, but the document survives, and a second `createDocument`
 * would reject).
 * @returns Resolves once an offscreen document is open.
 */
async function openOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  })
  if (existingContexts.length > 0) return

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH),
    reasons: ['BLOBS'],
    justification:
      'Create Blob object URLs for exported bookmark files too large for a data URL.',
  })
}

/**
 * Creates the offscreen document if one isn't already open, or awaits the
 * in-flight creation triggered by a previous, still-pending download in the
 * same run. Resets the cached promise on failure so a later call retries
 * document creation instead of re-throwing a stale rejection forever. Chained
 * onto {@link offscreenState}'s `lifecycle` promise so it never runs
 * concurrently with {@link closeOffscreenDocumentIfIdle}.
 * @returns Resolves once the offscreen document is open.
 */
async function ensureOffscreenDocument(): Promise<void> {
  await runLifecycleStep(async () => {
    if (!offscreenState.openDocumentPromise) {
      offscreenState.openDocumentPromise = openOffscreenDocument()
    }

    try {
      await offscreenState.openDocumentPromise
    } catch (error) {
      offscreenState.openDocumentPromise = null
      throw error
    }
  })
}

/**
 * Closes the offscreen document once every download started in this run has
 * settled, so a run exporting multiple formats reuses a single document
 * instead of opening and closing one per file. Chained onto
 * {@link offscreenState}'s `lifecycle` promise so it never runs concurrently
 * with {@link ensureOffscreenDocument}, and re-checks `pendingDownloads` at
 * the time it actually runs (not when it was called) in case another
 * download started in the meantime.
 * @returns Resolves once the document is closed, or immediately if another download is pending or none is open.
 */
async function closeOffscreenDocumentIfIdle(): Promise<void> {
  await runLifecycleStep(async () => {
    if (
      offscreenState.pendingDownloads > 0 ||
      !offscreenState.openDocumentPromise
    )
      return
    offscreenState.openDocumentPromise = null
    await chrome.offscreen.closeDocument()
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

/**
 * Resolves once `downloadId` reaches a terminal `browser.downloads.onChanged`
 * state, rejects if it is interrupted, or rejects after
 * {@link DOWNLOAD_SETTLE_TIMEOUT_MS} if it never settles. Always removes its
 * listener and timer when it settles.
 * @param downloadId The download to watch.
 * @returns Resolves on `'complete'`, rejects on `'interrupted'` or timeout.
 */
function waitForDownloadSettled(downloadId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timeoutHandle)
      browser.downloads.onChanged.removeListener(listener)
    }
    const listener = (delta: Browser.downloads.DownloadDelta): void => {
      if (delta.id !== downloadId) return
      const state = delta.state?.current
      if (state === 'complete') {
        cleanup()
        resolve()
      } else if (state === 'interrupted') {
        cleanup()
        const message = i18n.t('downloadInterrupted', [String(downloadId)])
        reject(new Error(message))
      }
    }
    const timeoutHandle = setTimeout(() => {
      cleanup()
      reject(new Error(`Download ${downloadId} timed out.`))
    }, DOWNLOAD_SETTLE_TIMEOUT_MS)
    browser.downloads.onChanged.addListener(listener)
  })
}

/**
 * Downloads `content` via a shared offscreen document instead of a base64
 * data URL, so exports aren't capped by the data-URL/IPC size limit. Creates
 * the offscreen document on first use (or reuses one already open from a
 * concurrent call in the same run), messages it to obtain a `Blob` object
 * URL, downloads that URL with `saveAs: false` and `conflictAction:
 * 'uniquify'`, and — once the download reaches `'complete'` or
 * `'interrupted'` — revokes the object URL and closes the offscreen document
 * if no other download from this run is still pending.
 * @param content The export content to download.
 * @param mimeType The content's MIME type.
 * @param filename The downloads-relative filename to save it as.
 * @returns Resolves once the download has settled and cleanup has run.
 */
export async function downloadViaOffscreenDocument(
  content: string,
  mimeType: string,
  filename: string,
): Promise<void> {
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
    } finally {
      await revokeBlobUrl(url)
    }
  } finally {
    offscreenState.pendingDownloads -= 1
    await closeOffscreenDocumentIfIdle()
  }
}
