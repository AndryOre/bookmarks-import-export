import { getFaviconBase64 } from "~common/lib/favicon"
import { type ExtendedBookmarkTreeNode } from "~common/types"

/**
 * Converts a timestamp from milliseconds to seconds.
 * @param {number} timestamp - The timestamp in milliseconds
 * @returns {number} The timestamp in seconds
 */
const toSeconds = (timestamp: number): number => Math.floor(timestamp / 1000)

/**
 * Escapes special characters in a string for use in HTML.
 * @param {string} unsafe - The string to be escaped
 * @returns {string} The escaped string
 */
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Generates HTML content for a bookmark node.
 * @param {ExtendedBookmarkTreeNode} node - The bookmark node
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDates - Whether to include date information
 * @param {number} level - The indentation level
 * @param {boolean} isOtherBookmarks - Whether the node is the "Other Bookmarks" folder
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<string>} The generated HTML content
 */
const generateHtmlContent = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  includeDates: boolean,
  level: number = 0,
  isOtherBookmarks: boolean = false,
  hideOtherBookmarks: boolean = true,
  hideParentFolder: boolean = false
): Promise<string> => {
  const indent = "    ".repeat(level)

  if (node.url) {
    return generateBookmarkHtml(node, includeIconData, includeDates, indent)
  } else if (!isOtherBookmarks || !hideOtherBookmarks) {
    return generateFolderHtml(
      node,
      includeIconData,
      includeDates,
      level,
      hideOtherBookmarks,
      hideParentFolder
    )
  } else {
    return generateOtherBookmarksHtml(
      node,
      includeIconData,
      includeDates,
      level,
      hideOtherBookmarks,
      hideParentFolder
    )
  }
}

/**
 * Generates HTML for a bookmark (leaf node).
 * @param {ExtendedBookmarkTreeNode} node - The bookmark node
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDates - Whether to include date information
 * @param {string} indent - The indentation string
 * @returns {Promise<string>} The generated HTML for the bookmark
 */
const generateBookmarkHtml = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  includeDates: boolean,
  indent: string
): Promise<string> => {
  let attributes = ""
  if (includeDates) {
    attributes += ` ADD_DATE="${toSeconds(node.dateAdded)}"`
    if (node.dateLastUsed) {
      attributes += ` LAST_USED="${toSeconds(node.dateLastUsed)}"`
    }
  }

  let iconHtml = ""
  if (includeIconData) {
    const iconData = await getFaviconBase64(node.url)
    iconHtml = iconData ? ` ICON="${iconData}"` : ""
  }

  return `${indent}<DT><A HREF="${escapeHtml(node.url)}"${attributes}${iconHtml}>${escapeHtml(node.title || "")}</A>\n`
}

/**
 * Generates HTML for a folder node.
 * @param {ExtendedBookmarkTreeNode} node - The folder node
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDates - Whether to include date information
 * @param {number} level - The indentation level
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<string>} The generated HTML for the folder
 */
const generateFolderHtml = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  includeDates: boolean,
  level: number,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<string> => {
  let htmlContent = ""
  const indent = "    ".repeat(level)

  if (!hideParentFolder || node.id === "1" || node.id === "2") {
    htmlContent += generateFolderHeaderHtml(node, includeDates, indent)
  }

  if (node.children) {
    for (const child of node.children) {
      htmlContent += await generateHtmlContent(
        child,
        includeIconData,
        includeDates,
        hideParentFolder && node.id !== "1" && node.id !== "2"
          ? level
          : level + 1,
        child.id === "2",
        hideOtherBookmarks,
        hideParentFolder
      )
    }
  }

  if (!hideParentFolder || node.id === "1" || node.id === "2") {
    htmlContent += `${indent}</DL><p>\n`
  }

  return htmlContent
}

/**
 * Generates HTML for the folder header.
 * @param {ExtendedBookmarkTreeNode} node - The folder node
 * @param {boolean} includeDates - Whether to include date information
 * @param {string} indent - The indentation string
 * @returns {string} The generated HTML for the folder header
 */
const generateFolderHeaderHtml = (
  node: ExtendedBookmarkTreeNode,
  includeDates: boolean,
  indent: string
): string => {
  let attributes = ""
  if (includeDates) {
    attributes += ` ADD_DATE="${toSeconds(node.dateAdded)}"`
    attributes += ` LAST_MODIFIED="${toSeconds(node.dateGroupModified || node.dateAdded)}"`
  }
  const personalBar = node.id === "1" ? ' PERSONAL_TOOLBAR_FOLDER="true"' : ""

  return `${indent}<DT><H3${attributes}${personalBar}>${escapeHtml(node.title || "")}</H3>\n${indent}<DL><p>\n`
}

/**
 * Generates HTML for the "Other Bookmarks" folder.
 * @param {ExtendedBookmarkTreeNode} node - The "Other Bookmarks" folder node
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDates - Whether to include date information
 * @param {number} level - The indentation level
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<string>} The generated HTML for the "Other Bookmarks" folder
 */
const generateOtherBookmarksHtml = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  includeDates: boolean,
  level: number,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<string> => {
  let htmlContent = ""
  if (node.children) {
    for (const child of node.children) {
      htmlContent += await generateHtmlContent(
        child,
        includeIconData,
        includeDates,
        level,
        false,
        hideOtherBookmarks,
        hideParentFolder
      )
    }
  }
  return htmlContent
}

/**
 * Exports bookmarks to HTML format.
 * @param {ExtendedBookmarkTreeNode[] | null} selectedBookmarks - Specific bookmarks to export, or null for all
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDates - Whether to include date information
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<string>} The generated HTML content
 */
export const exportToHTML = async (
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null = null,
  includeIconData: boolean = false,
  includeDates: boolean = true,
  hideOtherBookmarks: boolean = true,
  hideParentFolder: boolean = false
): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
        return
      }

      try {
        const htmlContent = await generateFullHtmlContent(
          bookmarkTreeNodes[0],
          selectedBookmarks,
          includeIconData,
          includeDates,
          hideOtherBookmarks,
          hideParentFolder
        )
        resolve(htmlContent)
      } catch (error) {
        reject(error)
      }
    })
  })
}

/**
 * Generates the full HTML content for the bookmarks.
 * @param {ExtendedBookmarkTreeNode} rootNode - The root bookmark node
 * @param {ExtendedBookmarkTreeNode[] | null} selectedBookmarks - Specific bookmarks to export, or null for all
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDates - Whether to include date information
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<string>} The generated full HTML content
 */
const generateFullHtmlContent = async (
  rootNode: ExtendedBookmarkTreeNode,
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null,
  includeIconData: boolean,
  includeDates: boolean,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<string> => {
  let htmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`

  if (selectedBookmarks) {
    for (const bookmark of selectedBookmarks) {
      htmlContent += await generateHtmlContent(
        bookmark,
        includeIconData,
        includeDates,
        1,
        bookmark.id === "2",
        hideOtherBookmarks,
        hideParentFolder
      )
    }
  } else {
    for (const child of rootNode.children || []) {
      if (child.id === "1" || child.id === "2") {
        htmlContent += await generateHtmlContent(
          child,
          includeIconData,
          includeDates,
          1,
          child.id === "2",
          hideOtherBookmarks,
          hideParentFolder
        )
      }
    }
  }

  htmlContent += "</DL><p>\n"
  return htmlContent
}
