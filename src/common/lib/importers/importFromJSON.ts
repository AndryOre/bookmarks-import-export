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
        chrome.i18n.getMessage("importFromJSONCreateError", [
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
 * @param {ParsedBookmark[]} bookmarksData - Array of parsed bookmarks from JSON.
 * @throws {BookmarkImportError} If processing bookmarks fails.
 */
const processBookmarks = async (
  bookmarkTreeNodes: chrome.bookmarks.BookmarkTreeNode[],
  bookmarksData: ParsedBookmark[]
) => {
  const bookmarksBar = bookmarkTreeNodes[0].children?.[0]
  const otherBookmarks = bookmarkTreeNodes[0].children?.[1]

  if (!bookmarksBar || !otherBookmarks) {
    throw new BookmarkImportError(
      chrome.i18n.getMessage("importFromJSONProcessError")
    )
  }

  const importedFolder = await chrome.bookmarks.create({
    title: chrome.i18n.getMessage("importedBookmarks")
  })

  for (const bookmark of bookmarksData) {
    if (bookmark.isBookmarksBar && bookmark.children?.length > 0) {
      const importedBookmarksBar = await chrome.bookmarks.create({
        parentId: importedFolder.id,
        title: chrome.i18n.getMessage("bookmarksBar")
      })

      for (const child of bookmark.children) {
        if (child.url) {
          await chrome.bookmarks.create({
            parentId: importedBookmarksBar.id,
            title: child.title,
            url: child.url
          })
        } else if (child.children) {
          const folder = await chrome.bookmarks.create({
            parentId: importedBookmarksBar.id,
            title: child.title
          })
          await createBookmarks(child.children, folder.id)
        }
      }
    } else if (bookmark.isOtherBookmarks || bookmark.children) {
      await createBookmarks(bookmark.children || [], importedFolder.id)
    } else if (bookmark.url) {
      await chrome.bookmarks.create({
        parentId: importedFolder.id,
        title: bookmark.title,
        url: bookmark.url
      })
    }
  }
}

/**
 * Preprocesses the bookmarks to add isBookmarksBar and isOtherBookmarks flags.
 * @param {ParsedBookmark[]} bookmarks - The original bookmarks array.
 * @returns {ParsedBookmark[]} The processed bookmarks array.
 */
const preprocessBookmarks = (bookmarks: ParsedBookmark[]): ParsedBookmark[] => {
  const processedBookmarks: ParsedBookmark[] = []
  const otherBookmarks: ParsedBookmark[] = []

  bookmarks.forEach((bookmark) => {
    if (bookmark.id === "1") {
      processedBookmarks.push({ ...bookmark, isBookmarksBar: true })
    } else if (bookmark.id === "2") {
      processedBookmarks.push({ ...bookmark, isOtherBookmarks: true })
    } else if (bookmark.parentId === "2") {
      otherBookmarks.push(bookmark)
    } else {
      processedBookmarks.push(bookmark)
    }
  })

  if (otherBookmarks.length > 0) {
    processedBookmarks.push({
      id: "2",
      title: chrome.i18n.getMessage("otherBookmarks"),
      dateAdded: Date.now(),
      isOtherBookmarks: true,
      children: otherBookmarks
    })
  }

  return processedBookmarks
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
              chrome.i18n.getMessage("importFromJSONProcessError_1", [
                chrome.runtime.lastError.message
              ])
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
    throw new BookmarkImportError(
      chrome.i18n.getMessage("importFromJSONImportError", [error.message])
    )
  }
}
