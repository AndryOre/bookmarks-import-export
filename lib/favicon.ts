import { i18n } from '#i18n'

/**
 * Data URL of Chrome's generic globe placeholder icon, as returned by the
 * `_favicon` API when it has no favicon cached for a page. Compared against
 * byte-for-byte so callers can treat "no real favicon" the same as an error,
 * instead of surfacing the placeholder as if it were the site's own icon.
 */
const DEFAULT_CHROME_FAVICON =
  'data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAEAAAABAAAAABABgAAAAAAA' +
  'QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArwCv' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

/**
 * Builds a URL into Chrome's `_favicon` internal API, which serves cached
 * favicons for any page URL without a network fetch to the site itself.
 * This is a Chrome-only extension API and requires the `favicon` permission
 * in the manifest.
 */
export function getFaviconUrl(url: string, size: number = 16): string {
  const faviconUrl = new URL(browser.runtime.getURL('/_favicon/?'))
  faviconUrl.searchParams.set('pageUrl', url)
  faviconUrl.searchParams.set('size', size.toString())
  return faviconUrl.href
}

/**
 * Resolves a page URL's favicon as a base64 data URL via {@link getFaviconUrl}.
 * Returns `''` — never throws — both when the `_favicon` API falls back to
 * Chrome's default globe placeholder (see {@link DEFAULT_CHROME_FAVICON}) and
 * when fetching or reading the response fails for any other reason, so
 * callers can treat "no favicon" uniformly instead of handling a rejection.
 */
export async function getFaviconBase64(
  url: string,
  size: number = 16,
): Promise<string> {
  try {
    const faviconUrl = getFaviconUrl(url, size)
    const response = await fetch(faviconUrl)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('loadend', () => {
        const result = reader.result as string
        if (result === DEFAULT_CHROME_FAVICON) {
          resolve('')
        } else {
          resolve(result)
        }
      })
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error(i18n.t('faviconError'), error)
    return ''
  }
}
