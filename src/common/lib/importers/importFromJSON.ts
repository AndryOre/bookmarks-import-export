/**
 * This module provides functionality to import bookmarks from JSON format into Chrome's bookmark structure.
 * @module importFromJSON
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
        `Error creating ${node.url ? "bookmark" : "folder"} ${node.title}: ${error.message}`
      )
    }
  }
}

/**
 * Processes parsed bookmarks and creates them in Chrome's bookmark structure.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTreeNodes - Chrome's existing bookmark tree.
 * @param {ParsedBookmark[]} bookmarksData - Array of parsed bookmarks from JSON.
 * @throws {BookmarkImportError} If processing bookmarks fails.
 */
const processBookmarks = async (
  bookmarkTreeNodes: chrome.bookmarks.BookmarkTreeNode[],
  bookmarksData: ParsedBookmark[]
) => {
  const bookmarksBar = bookmarkTreeNodes[0].children?.find(
    (child) => child.id === "1"
  )
  const otherBookmarks = bookmarkTreeNodes[0].children?.find(
    (child) => child.id === "2"
  )

  if (!bookmarksBar || !otherBookmarks) {
    throw new BookmarkImportError(
      "Could not find Bookmarks bar or Other bookmarks folder"
    )
  }

  for (const bookmark of bookmarksData) {
    if (bookmark.isBookmarksBar) {
      await createBookmarks(bookmark.children || [], bookmarksBar.id)
    } else if (bookmark.isOtherBookmarks) {
      await createBookmarks(bookmark.children || [], otherBookmarks.id)
    }
  }
}

/**
 * Preprocesses the bookmarks to add isBookmarksBar and isOtherBookmarks flags.
 * @param {ParsedBookmark[]} bookmarks - The original bookmarks array.
 * @returns {ParsedBookmark[]} The processed bookmarks array.
 */
const preprocessBookmarks = (bookmarks: ParsedBookmark[]): ParsedBookmark[] => {
  return bookmarks.map((bookmark) => {
    if (bookmark.id === "1") {
      return { ...bookmark, isBookmarksBar: true }
    } else if (bookmark.id === "2") {
      return { ...bookmark, isOtherBookmarks: true }
    }
    return bookmark
  })
}

/**
 * Imports bookmarks from a JSON object into Chrome's bookmark structure.
 * @param {ParsedBookmark[]} bookmarks - The JSON object containing bookmarks to import.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 * @throws {BookmarkImportError} If the import process fails at any stage.
 */
export const importFromJSON = async (
  bookmarks: ParsedBookmark[]
): Promise<void> => {
  try {
    const processedBookmarks = preprocessBookmarks(bookmarks)

    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(
            new BookmarkImportError(
              `Chrome API error: ${chrome.runtime.lastError.message}`
            )
          )
        } else {
          try {
            await processBookmarks(bookmarkTreeNodes, processedBookmarks)
            resolve()
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  } catch (error) {
    throw new BookmarkImportError(`Import failed: ${error.message}`)
  }
}
