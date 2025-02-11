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

const DEFAULT_CHROME_FAVICON = "data:image/bmp;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABRklEQVR42mKgOqjq75ds7510YNL0uV9nAGqniqwKYiCIHIIjcAK22BGQLRdgBWvc3fnWk/FJhrkPO1xPgGvqPfLfJMHhT1yqurvS48bPaJhjD2efgidnVwa2yv59xecvEvi0UWCXq9t0ItfP2MMZ7nwIpkA8F1n8uLxZHM6yrBH7FIl2gFXDHYsErkn2hyKLHtcKrFntk58uVQJ+kSdQnmjhID4cwLLa8+K0BXsfNWCqBOsFdo2Yldv43DBrkxd30cjnNyYBhK0SQGkI9pG4Mu40D5b374DRCAyhHqXVfTmOwivivMkJxBz5wnHCtBfGgNFC+ChWKWRf3hsQIlyEoIv4IYEo5wkgtBLRekY9DE4Uin4Keae6hydGnljPmE8kRcCine6827AMsJ1IuW9ibnlQpXLBCR/WC875m2BP+VSu3c/0m+8V08OBngc0pxcAAAAASUVORK5CYII="

/**
 * Fetches the favicon for a given URL and returns it as a base64 encoded string.
 * @param url The URL of the page to fetch the favicon for.
 * @param size The desired size of the favicon (default is 16).
 * @returns A Promise that resolves to the base64 encoded favicon data, or empty string if no custom favicon found.
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
      reader.onloadend = () => {
        const result = reader.result as string
        if (result === DEFAULT_CHROME_FAVICON) {
          resolve("")
        } else {
          resolve(result)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error fetching favicon:", error)
    return ""
  }
}
