import { type BookmarkFormat } from "~common/types"
import Papa from "papaparse"

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

    case "text/csv":
      return isValidCSV(content) ? "csv" : "unknown"

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

/**
 * Checks if the content is valid CSV bookmark format.
 * @param {string} content - The content to check.
 * @returns {boolean} True if the content appears to be valid CSV bookmark format, false otherwise.
 */
const isValidCSV = (content: string): boolean => {
  try {
    const result = Papa.parse(content.trim(), {
      header: true,
      skipEmptyLines: true,
      preview: 3 // Only parse first 3 rows for validation
    })

    // Check if parsing was successful and has data
    if (result.errors.length > 0 || result.data.length === 0) {
      return false
    }

    // Check if required fields are present
    const fields = result.meta.fields || []
    const hasRequiredFields = fields.some(field =>
      field.toLowerCase().includes("title") &&
      fields.some(field => field.toLowerCase().includes("url"))
    )

    if (!hasRequiredFields) {
      return false
    }

    return true
  } catch {
    return false
  }
}
