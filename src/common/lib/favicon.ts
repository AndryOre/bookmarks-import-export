/**
 * Generates a URL for fetching a favicon using Chrome's favicon API.
 * @param url The URL of the page to fetch the favicon for.
 * @param size The desired size of the favicon (default is 16).
 * @returns A string representing the URL to fetch the favicon.
 */
export function getFaviconUrl(url: string, size: number = 16): string {
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"))
  faviconUrl.searchParams.set("pageUrl", url)
  faviconUrl.searchParams.set("size", size.toString())
  return faviconUrl.toString()
}

/**
 * Fetches the favicon for a given URL and returns it as a base64 encoded string.
 * @param url The URL of the page to fetch the favicon for.
 * @param size The desired size of the favicon (default is 16).
 * @returns A Promise that resolves to the base64 encoded favicon data.
 */
export async function getFaviconBase64(
  url: string,
  size: number = 16
): Promise<string> {
  try {
    const faviconUrl = getFaviconUrl(url, size)
    const response = await fetch(faviconUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error fetching favicon:", error)
    return ""
  }
}
