import {
  CREATE_BLOB_URL_MESSAGE_TYPE,
  type CreateBlobUrlMessage,
  type CreateBlobUrlResponse,
  REVOKE_BLOB_URL_MESSAGE_TYPE,
  type RevokeBlobUrlMessage,
} from '@/lib/offscreen-download'

/**
 * Offscreen document entrypoint. Runs in a real document context (unlike
 * the service worker), so it's the only place `auto-export.ts` can turn
 * export content into a `Blob` object URL. Handles the two message types
 * `downloadViaOffscreenDocument` sends: creating an object URL for new
 * export content, and revoking one once its download has settled. Uses
 * `chrome.runtime.onMessage` (rather than `browser.runtime.onMessage`, which
 * types its listener as `void`-returning) so it can reply asynchronously via
 * `sendResponse` and `return true`, Chrome's documented pattern for that.
 */
chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message)) {
      return false
    }

    if (message.type === CREATE_BLOB_URL_MESSAGE_TYPE) {
      const { content, mimeType } = message as CreateBlobUrlMessage
      const blob = new Blob([content], { type: mimeType })
      const response: CreateBlobUrlResponse = { url: URL.createObjectURL(blob) }
      sendResponse(response)
      return true
    }

    if (message.type === REVOKE_BLOB_URL_MESSAGE_TYPE) {
      const { url } = message as RevokeBlobUrlMessage
      URL.revokeObjectURL(url)
      sendResponse(undefined)
      return true
    }

    return false
  },
)
