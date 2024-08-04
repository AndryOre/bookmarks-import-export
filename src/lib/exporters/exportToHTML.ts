/**
 * Extended BookmarkTreeNode type to include possible non-standard properties.
 */
interface ExtendedBookmarkTreeNode extends chrome.bookmarks.BookmarkTreeNode {
  dateGroupModified?: number
  dateLastUsed?: number
  [key: string]: any // Allow any other properties
}

/**
 * Utility function to escape HTML special characters.
 * @param {string} unsafe - The string to escape.
 * @returns {string} The escaped string.
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
 * Converts a timestamp from milliseconds to seconds.
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {number} The timestamp in seconds.
 */
const toSeconds = (timestamp: number): number => {
  return Math.floor(timestamp / 1000)
}

/**
 * Recursively converts bookmarks to HTML format.
 * @param {ExtendedBookmarkTreeNode[]} nodes - The array of bookmark nodes.
 * @param {number} level - The current depth level for indentation.
 * @returns {string} The HTML string representing the bookmarks.
 */
const generateHtmlContent = (
  nodes: ExtendedBookmarkTreeNode[],
  level = 1
): string => {
  let htmlContent = ""
  const indent = "    ".repeat(level)

  for (const node of nodes) {
    if (node.url) {
      // Bookmark
      let attributes = `ADD_DATE="${toSeconds(node.dateAdded)}"`
      if (node.dateLastUsed) {
        attributes += ` LAST_USED="${toSeconds(node.dateLastUsed)}"`
      }
      htmlContent +=
        indent +
        `<DT><A HREF="${escapeHtml(node.url)}" ${attributes}>${escapeHtml(node.title || "")}</A>\n`
    } else {
      // Folder
      const lastModified = toSeconds(
        node.dateGroupModified || node.dateAdded || Date.now()
      )
      const personalToolbarFolderAttr =
        node.id === "1" ? ' PERSONAL_TOOLBAR_FOLDER="true"' : ""
      let attributes = `ADD_DATE="${toSeconds(node.dateAdded)}" LAST_MODIFIED="${lastModified}"${personalToolbarFolderAttr}`
      if (node.dateLastUsed) {
        attributes += ` LAST_USED="${toSeconds(node.dateLastUsed)}"`
      }

      htmlContent +=
        indent + `<DT><H3 ${attributes}>${escapeHtml(node.title || "")}</H3>\n`
      htmlContent += indent + "<DL><p>\n"
      htmlContent += generateHtmlContent(node.children || [], level + 1)
      htmlContent += indent + "</DL><p>\n"
    }
  }

  return htmlContent
}

/**
 * Exports bookmarks to HTML format.
 * @returns {Promise<string>} A promise that resolves to the HTML string representing the bookmarks.
 */
export const exportToHTML = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          try {
            const htmlHeader = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`

            let bookmarksContent = ""

            // Process the root folders (Bookmarks bar and Other bookmarks)
            for (const node of (bookmarkTreeNodes[0].children ||
              []) as ExtendedBookmarkTreeNode[]) {
              if (node.id === "1") {
                const lastModified = toSeconds(
                  node.dateGroupModified || node.dateAdded || Date.now()
                )
                let attributes = `ADD_DATE="${toSeconds(node.dateAdded)}" LAST_MODIFIED="${lastModified}" PERSONAL_TOOLBAR_FOLDER="true"`
                if (node.dateLastUsed) {
                  attributes += ` LAST_USED="${toSeconds(node.dateLastUsed)}"`
                }
                bookmarksContent += `    <DT><H3 ${attributes}>${node.title}</H3>\n`
                bookmarksContent += "    <DL><p>\n"
                bookmarksContent += generateHtmlContent(node.children || [], 2)
                bookmarksContent += "    </DL><p>\n"
              } else if (node.id === "2") {
                // Directly add the contents of "Other bookmarks" without wrapping them
                bookmarksContent += generateHtmlContent(node.children || [], 1)
              }
            }

            const htmlFooter = "</DL><p>\n"

            // Combine header, content, and footer
            const fullHtml = htmlHeader + bookmarksContent + htmlFooter
            resolve(fullHtml)
          } catch (error) {
            reject(error)
          }
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}
