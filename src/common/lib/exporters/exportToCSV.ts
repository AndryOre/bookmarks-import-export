import Papa from "papaparse"
import { getFaviconBase64 } from "~common/lib/favicon"
import type { DateOptions, ExtendedBookmarkTreeNode } from "~common/types"

const toSeconds = (timestamp: number): number => {
  return Math.floor(timestamp / 1000)
}

const processBookmark = async (
  node: ExtendedBookmarkTreeNode,
  parentFolder: string,
  includeIconData: boolean,
  dateOptions: DateOptions
): Promise<Record<string, string | number>> => {
  const row: Record<string, string | number> = {
    title: node.title || "",
    url: node.url,
    folder: parentFolder
  }

  if (dateOptions.includeDateAdded && node.dateAdded) {
    row.dateAdded = toSeconds(node.dateAdded)
  }

  if (dateOptions.includeDateLastUsed && node.dateLastUsed) {
    row.dateLastUsed = toSeconds(node.dateLastUsed)
  }

  if (includeIconData && node.url) {
    row.iconData = await getFaviconBase64(node.url)
  }

  return row
}

const processFolder = async (
  node: ExtendedBookmarkTreeNode,
  parentFolder: string,
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideParentFolder: boolean
): Promise<Array<Record<string, string | number>>> => {
  if (hideParentFolder && node.id !== "1" && node.id !== "2") {
    return processChildrenDirectly(
      node,
      parentFolder,
      includeIconData,
      dateOptions,
      hideParentFolder
    )
  } else {
    return processFolderWithStructure(
      node,
      parentFolder,
      includeIconData,
      dateOptions,
      hideParentFolder
    )
  }
}

const processChildrenDirectly = async (
  node: ExtendedBookmarkTreeNode,
  parentFolder: string,
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideParentFolder: boolean
): Promise<Array<Record<string, string | number>>> => {
  let rows: Array<Record<string, string | number>> = []
  for (const child of node.children || []) {
    const childRows = await processNode(
      child,
      parentFolder,
      includeIconData,
      dateOptions,
      hideParentFolder
    )
    rows.push(...childRows)
  }
  return rows
}

const processFolderWithStructure = async (
  node: ExtendedBookmarkTreeNode,
  parentFolder: string,
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideParentFolder: boolean
): Promise<Array<Record<string, string | number>>> => {
  const newParentFolder = parentFolder
    ? `${parentFolder}/${node.title}`
    : node.title || ""

  let rows: Array<Record<string, string | number>> = []
  for (const child of node.children || []) {
    const childRows = await processNode(
      child,
      newParentFolder,
      includeIconData,
      dateOptions,
      hideParentFolder
    )
    rows.push(...childRows)
  }
  return rows
}

const processNode = async (
  node: ExtendedBookmarkTreeNode,
  parentFolder: string,
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideParentFolder: boolean = false
): Promise<Array<Record<string, string | number>>> => {
  if (node.url) {
    return [await processBookmark(node, parentFolder, includeIconData, dateOptions)]
  } else if (node.children) {
    return processFolder(
      node,
      parentFolder,
      includeIconData,
      dateOptions,
      hideParentFolder
    )
  }
  return []
}

export const exportToCSV = async (
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null = null,
  includeIconData: boolean = true,
  includeDateAdded: boolean = true,
  includeDateLastUsed: boolean = false,
  hideParentFolder: boolean = false
): Promise<string> => {
  const dateOptions: DateOptions = {
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified: false
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }

        let rows: Array<Record<string, string | number>> = []

        if (selectedBookmarks) {
          for (const bookmark of selectedBookmarks) {
            const bookmarkRows = await processNode(
              bookmark,
              "",
              includeIconData,
              dateOptions,
              hideParentFolder
            )
            rows.push(...bookmarkRows)
          }
        } else {
          rows = await processNode(
            bookmarkTreeNodes[0],
            "",
            includeIconData,
            dateOptions,
            hideParentFolder
          )
        }

        const fields = ["title", "url", "folder"]
        if (includeDateAdded) fields.push("dateAdded")
        if (includeDateLastUsed) fields.push("dateLastUsed")
        if (includeIconData) fields.push("iconData")

        const csv = Papa.unparse(rows, {
          quotes: true,
          delimiter: ",",
          header: true,
          columns: fields
        })

        resolve(csv)
      })
    } catch (error) {
      reject(error)
    }
  })
}

