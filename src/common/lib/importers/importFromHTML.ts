/**
 * This module provides functionality to import bookmarks from HTML format into Chrome's bookmark structure.
 * @module importFromHTML
 */

import { type ParsedBookmark } from "~common/types"

/**
 * Custom error class for bookmark import errors.
 */
class BookmarkImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BookmarkImportError"
  }
}

/**
 * Parses an HTML string of bookmarks and returns a structured array.
 * @param {string} html - The HTML string containing bookmarks.
 * @returns {ParsedBookmark[]} An array of parsed bookmark objects.
 * @throws {BookmarkImportError} If parsing fails.
 */
const parseHTML = (html: string): ParsedBookmark[] => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    const parseNode = (node: Element): ParsedBookmark | null => {
      if (node.tagName === "A") {
        return {
          title: node.textContent?.trim() || "",
          url: node.getAttribute("href") || "",
          dateAdded: node.hasAttribute("add_date")
            ? parseInt(node.getAttribute("add_date") || "0") * 1000
            : Date.now()
        }
      } else if (node.tagName === "H3") {
        const nextSibling = node.nextElementSibling
        const children: ParsedBookmark[] = []
        if (nextSibling && nextSibling.tagName === "DL") {
          nextSibling.querySelectorAll(":scope > dt").forEach((dt) => {
            const parsed = parseNode(dt.firstElementChild)
            if (parsed) children.push(parsed)
          })
        }
        return {
          title: node.textContent?.trim() || "",
          dateAdded: node.hasAttribute("add_date")
            ? parseInt(node.getAttribute("add_date") || "0") * 1000
            : Date.now(),
          dateGroupModified: node.hasAttribute("last_modified")
            ? parseInt(node.getAttribute("last_modified") || "0") * 1000
            : Date.now(),
          children: children
        }
      }
      return null
    }

    const bookmarks: ParsedBookmark[] = []
    const bookmarksBarNode = doc.querySelector(
      'h3[personal_toolbar_folder="true"]'
    )
    const otherBookmarks: ParsedBookmark[] = []

    const dlElements = doc.querySelectorAll("body > dl > dt")
    dlElements.forEach((dt) => {
      const parsed = parseNode(dt.firstElementChild)
      if (parsed) {
        if (dt.firstElementChild === bookmarksBarNode) {
          parsed.isBookmarksBar = true
          bookmarks.push(parsed)
        } else {
          otherBookmarks.push(parsed)
        }
      }
    })

    if (otherBookmarks.length > 0) {
      bookmarks.push({
        isOtherBookmarks: true,
        title: chrome.i18n.getMessage("otherBookmarks"),
        dateAdded: Date.now(),
        children: otherBookmarks
      })
    }

    return bookmarks
  } catch (error) {
    throw new BookmarkImportError(
      chrome.i18n.getMessage("importFromHTMLLoadError", [error.message])
    )
  }
}

/**
 * Recursively creates bookmarks and folders in Chrome.
 * @param {ParsedBookmark[]} nodes - Array of bookmark nodes to create.
 * @param {string} parentId - ID of the parent folder where bookmarks will be created.
 * @throws {BookmarkImportError} If creating a bookmark or folder fails.
 */
const createBookmarks = async (nodes: ParsedBookmark[], parentId: string) => {
  for (const node of nodes) {
    try {
      if (node.url) {
        await chrome.bookmarks.create({
          parentId,
          title: node.title,
          url: node.url
        })
      } else if (node.children && node.children.length > 0) {
        const newFolder = await chrome.bookmarks.create({
          parentId,
          title: node.title
        })
        await createBookmarks(node.children, newFolder.id)
      }
    } catch (error) {
      throw new BookmarkImportError(
        chrome.i18n.getMessage("importFromHTMLCreateError", [
          node.url ? "bookmark" : "folder",
          node.title,
          error.message
        ])
      )
    }
  }
}

/**
 * Processes parsed bookmarks and creates them in Chrome's bookmark structure.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTreeNodes - Chrome's existing bookmark tree.
 * @param {ParsedBookmark[]} parsedBookmarks - Array of parsed bookmarks from HTML.
 * @param {string} importedFolderId - ID of the imported folder.
 * @throws {BookmarkImportError} If processing bookmarks fails.
 */
const processBookmarks = async (
  bookmarkTreeNodes: chrome.bookmarks.BookmarkTreeNode[],
  parsedBookmarks: ParsedBookmark[],
  importedFolderId: string
) => {
  const bookmarksBar = bookmarkTreeNodes[0].children?.[0]
  const otherBookmarks = bookmarkTreeNodes[0].children?.[1]

  if (!bookmarksBar || !otherBookmarks) {
    throw new BookmarkImportError(
      chrome.i18n.getMessage("importFromHTMLProcessError")
    )
  }

  const importedBookmarksBar = await chrome.bookmarks.create({
    parentId: importedFolderId,
    title: chrome.i18n.getMessage("bookmarksBar")
  })

  for (const bookmark of parsedBookmarks) {
    if (bookmark.isBookmarksBar) {
      await createBookmarks(bookmark.children || [], importedBookmarksBar.id)
    } else if (bookmark.isOtherBookmarks) {
      await createBookmarks(bookmark.children || [], importedFolderId)
    }
  }
}

/**
 * Imports bookmarks from an HTML string into Chrome's bookmark structure.
 * @param {string} html - The HTML string containing bookmarks to import.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 * @throws {BookmarkImportError} If the import process fails at any stage.
 */
export const importFromHTML = async (html: string): Promise<void> => {
  try {
    const parsedBookmarks = parseHTML(html)
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(
            new BookmarkImportError(
              chrome.i18n.getMessage("importFromHTMLProcessError", [
                chrome.runtime.lastError.message
              ])
            )
          )
        } else {
          try {
            const importedFolder = await chrome.bookmarks.create({
              title: chrome.i18n.getMessage("importedBookmarks")
            })
            await processBookmarks(
              bookmarkTreeNodes,
              parsedBookmarks,
              importedFolder.id
            )
            resolve()
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  } catch (error) {
    throw new BookmarkImportError(
      chrome.i18n.getMessage("importFromHTMLImportError", [error.message])
    )
  }
}
