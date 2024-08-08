import { type BookmarkFormat } from "~common/types"

/**
 * Detects the format of the bookmark content.
 * @param {string} content - The content of the bookmark file as a string.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {BookmarkFormat} The detected format: "json", "html", "csv", or "unknown".
 */
export const detectFormat = (
  content: string,
  mimeType: string
): BookmarkFormat => {
  const type = mimeType.toLowerCase()

  switch (type) {
    case "application/json":
      return isValidJSON(content) ? "json" : "unknown"

    case "text/html":
      return isValidHTML(content) ? "html" : "unknown"

    default:
      return "unknown"
  }
}

/**
 * Checks if the content is valid JSON.
 * @param {string} content - The content to check.
 * @returns {boolean} True if the content is valid JSON, false otherwise.
 */
const isValidJSON = (content: string): boolean => {
  try {
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

/**
 * Checks if the content is valid HTML bookmark format.
 * @param {string} content - The content to check.
 * @returns {boolean} True if the content is valid HTML bookmark format, false otherwise.
 */
const isValidHTML = (content: string): boolean => {
  return content.trim().startsWith("<!DOCTYPE NETSCAPE-Bookmark-file-1>")
}
