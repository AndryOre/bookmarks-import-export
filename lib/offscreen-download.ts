import type { Browser } from '@wxt-dev/browser'

/**
 * Relative URL of the offscreen document created by
 * {@link downloadViaOffscreenDocument}, served by the `entrypoints/offscreen`
 * unlisted entrypoint.
 */
export const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html'

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
 */
const offscreenState: {
  openDocumentPromise: Promise<void> | null
  pendingDownloads: number
} = {
  openDocumentPromise: null,
  pendingDownloads: 0,
}

/**
 * Creates the offscreen document if one isn't already open, or awaits the
 * in-flight creation triggered by a previous, still-pending download in the
 * same run. Resets the cached promise on failure so a later call retries
 * document creation instead of re-throwing a stale rejection forever.
 * @returns Resolves once the offscreen document is open.
 */
async function ensureOffscreenDocument(): Promise<void> {
  if (!offscreenState.openDocumentPromise) {
    offscreenState.openDocumentPromise = chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH),
      reasons: ['BLOBS'],
      justification:
        'Create Blob object URLs for exported bookmark files too large for a data URL.',
    })
  }

  try {
    await offscreenState.openDocumentPromise
  } catch (error) {
    offscreenState.openDocumentPromise = null
    throw error
  }
}

/**
 * Closes the offscreen document once every download started in this run has
 * settled, so a run exporting multiple formats reuses a single document
 * instead of opening and closing one per file.
 * @returns Resolves once the document is closed, or immediately if another download is still pending.
 */
async function closeOffscreenDocumentIfIdle(): Promise<void> {
  if (offscreenState.pendingDownloads > 0) return
  offscreenState.openDocumentPromise = null
  await chrome.offscreen.closeDocument()
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
 * state, or rejects if it is interrupted.
 * @param downloadId The download to watch.
 * @returns Resolves on `'complete'`, rejects on `'interrupted'`.
 */
function waitForDownloadSettled(downloadId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = (delta: Browser.downloads.DownloadDelta): void => {
      if (delta.id !== downloadId) return
      const state = delta.state?.current
      if (state === 'complete') {
        browser.downloads.onChanged.removeListener(listener)
        resolve()
      } else if (state === 'interrupted') {
        browser.downloads.onChanged.removeListener(listener)
        reject(new Error(`Download ${downloadId} was interrupted.`))
      }
    }
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
  await ensureOffscreenDocument()
  const url = await requestBlobUrl(content, mimeType)

  offscreenState.pendingDownloads += 1
  try {
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
