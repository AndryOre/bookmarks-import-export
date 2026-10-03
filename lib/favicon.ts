import { i18n } from '#i18n'

/**
 * A page URL on the reserved `.invalid` TLD, which Chrome can never have a
 * favicon cached for, so the `_favicon` API always answers it with its
 * generic globe placeholder.
 */
const UNCACHEABLE_PAGE_URL = 'https://snug.invalid/'

const placeholderBySize = new Map<number, Promise<string>>()

/**
 * Builds a URL into Chrome's `_favicon` internal API, which serves cached
 * favicons for any page URL without a network fetch to the site itself.
 * This is a Chrome-only extension API and requires the `favicon` permission
 * in the manifest.
 * @param url The page URL to fetch a favicon for.
 * @param size The requested favicon size, in pixels.
 * @returns The `_favicon` API URL for that page and size.
 */
export function getFaviconUrl(url: string, size: number = 16): string {
  const faviconUrl = new URL(browser.runtime.getURL('/_favicon/?'))
  faviconUrl.searchParams.set('pageUrl', url)
  faviconUrl.searchParams.set('size', size.toString())
  return faviconUrl.href
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('loadend', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

async function fetchFaviconDataUrl(url: string, size: number): Promise<string> {
  const response = await fetch(getFaviconUrl(url, size))
  return readBlobAsDataUrl(await response.blob())
}

async function lookUpPlaceholderDataUrl(size: number): Promise<string> {
  try {
    return await fetchFaviconDataUrl(UNCACHEABLE_PAGE_URL, size)
  } catch {
    placeholderBySize.delete(size)
    return ''
  }
}

function getPlaceholderDataUrl(size: number): Promise<string> {
  let placeholder = placeholderBySize.get(size)
  if (!placeholder) {
    placeholder = lookUpPlaceholderDataUrl(size)
    placeholderBySize.set(size, placeholder)
  }
  return placeholder
}

/**
 * Resolves a page URL's favicon as a base64 data URL via {@link getFaviconUrl}.
 * Returns `''` — never throws — both when the `_favicon` API falls back to
 * Chrome's default globe placeholder and when fetching or reading the
 * response fails for any other reason, so callers can treat "no favicon"
 * uniformly instead of handling a rejection.
 *
 * The placeholder is detected at runtime by comparing against the icon the
 * API serves for a page Chrome cannot have cached (memoized per size). If
 * that lookup fails, the icon is returned as-is rather than failing the call.
 * @param url The page URL to resolve a favicon for.
 * @param size The requested favicon size, in pixels.
 * @returns The favicon as a base64 data URL, or `''` if none is available.
 */
export async function getFaviconBase64(
  url: string,
  size: number = 16,
): Promise<string> {
  try {
    const [dataUrl, placeholder] = await Promise.all([
      fetchFaviconDataUrl(url, size),
      getPlaceholderDataUrl(size),
    ])
    return placeholder !== '' && dataUrl === placeholder ? '' : dataUrl
  } catch (error) {
    console.error(i18n.t('faviconError'), error)
    return ''
  }
}
