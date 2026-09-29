import { i18n } from '#i18n'

const DEFAULT_CHROME_FAVICON =
  'data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAEAAAABAAAAABABgAAAAAAA' +
  'QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArwCv' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

export function getFaviconUrl(url: string, size: number = 16): string {
  const faviconUrl = new URL(browser.runtime.getURL('/_favicon/' as any))
  faviconUrl.searchParams.set('pageUrl', url)
  faviconUrl.searchParams.set('size', size.toString())
  return faviconUrl.toString()
}

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
      reader.onloadend = () => {
        const result = reader.result as string
        if (result === DEFAULT_CHROME_FAVICON) {
          resolve('')
        } else {
          resolve(result)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error(i18n.t('faviconError'), error)
    return ''
  }
}
