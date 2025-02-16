/**
 * This module provides functionality to import bookmarks from CSV format into Chrome's bookmark structure.
 * @module importFromCSV
 */

import Papa from "papaparse"
import { type ParsedBookmark } from "~common/types"

type CSVRow = {
  title: string
  url: string
  folder?: string
  [key: string]: string | undefined
}

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
        const existingFolders = await chrome.bookmarks.search({ title: node.title })
        const existingFolder = existingFolders.find(
          folder => folder.parentId === parentId
        )

        const folderId = existingFolder
          ? existingFolder.id
          : (await chrome.bookmarks.create({
              parentId,
              title: node.title
            })).id

        await createBookmarks(node.children, folderId)
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
 * @param {ParsedBookmark[]} parsedBookmarks - Array of parsed bookmarks from CSV.
 * @throws {BookmarkImportError} If processing bookmarks fails.
 */
const processBookmarks = async (
  bookmarkTreeNodes: chrome.bookmarks.BookmarkTreeNode[],
  parsedBookmarks: ParsedBookmark[]
) => {
  const bookmarksBar = bookmarkTreeNodes[0].children?.[0]
  const otherBookmarks = bookmarkTreeNodes[0].children?.[1]

  if (!bookmarksBar || !otherBookmarks) {
    throw new BookmarkImportError(
      "Could not find Bookmarks bar or Other bookmarks folder"
    )
  }

  const existingFolders = await chrome.bookmarks.search({ title: "Imported bookmarks" })
  const importedFolder = existingFolders.length > 0
    ? existingFolders[0]
    : await chrome.bookmarks.create({
        title: "Imported bookmarks"
      })

  await createBookmarks(parsedBookmarks, importedFolder.id)
}

/**
 * Parses CSV data into the bookmark structure.
 * @param {CSVRow[]} csvData - The parsed CSV data.
 * @returns {ParsedBookmark[]} Array of parsed bookmarks with folder structure.
 */
const processCSVData = (csvData: CSVRow[]): ParsedBookmark[] => {
  const bookmarks: { [key: string]: ParsedBookmark } = {}
  const rootBookmarks: ParsedBookmark[] = []
  const now = Date.now()

  csvData.forEach((row) => {
    const title = row.title?.trim()
    const url = row.url?.trim()
    const folderPath = row.folder?.trim() || ""

    if (!title || !url) return

    try {
      new URL(url)
    } catch {
      console.warn(`Skipping invalid URL for bookmark "${title}": ${url}`)
      return
    }

    const folders = folderPath.split('/')
      .map(f => f.trim())
      .filter(f => f)

    let currentLevel = rootBookmarks
    let currentPath = ""

    for (const folder of folders) {
      currentPath = currentPath ? `${currentPath}/${folder}` : folder

      if (!bookmarks[currentPath]) {
        const newFolder: ParsedBookmark = {
          title: folder,
          dateAdded: now,
          dateGroupModified: now,
          children: []
        }
        bookmarks[currentPath] = newFolder
        currentLevel.push(newFolder)
      }

      currentLevel = bookmarks[currentPath].children!
    }

    currentLevel.push({
      title,
      url,
      dateAdded: now
    })
  })

  return rootBookmarks
}

/**
 * Imports bookmarks from a CSV string into Chrome's bookmark structure.
 * @param {string} csv - The CSV string containing bookmarks to import.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 * @throws {BookmarkImportError} If the import process fails at any stage.
 */
export const importFromCSV = async (csv: string): Promise<void> => {
  try {
    const result = Papa.parse<CSVRow>(csv.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    })

    if (result.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(", ")}`)
    }

    const parsedBookmarks = processCSVData(result.data)

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
            await processBookmarks(bookmarkTreeNodes, parsedBookmarks)
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
