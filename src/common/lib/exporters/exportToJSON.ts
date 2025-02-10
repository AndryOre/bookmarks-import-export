import { getFaviconBase64 } from "~common/lib/favicon"
import { type DateOptions, type ExtendedBookmarkTreeNode } from "~common/types"

/**
 * Converts a timestamp from milliseconds to seconds.
 * @param {number} timestamp - The timestamp in milliseconds
 * @returns {number} The timestamp in seconds
 */
const toSeconds = (timestamp: number): number => {
  return Math.floor(timestamp / 1000)
}

/**
 * Processes a bookmark node, applying the specified options.
 * @param {ExtendedBookmarkTreeNode} node - The bookmark node to process
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @param {boolean} isOtherBookmarks - Whether the node is the "Other Bookmarks" folder
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array of processed bookmark nodes
 */
const processNode = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  dateOptions: DateOptions,
  isOtherBookmarks: boolean = false,
  hideOtherBookmarks: boolean = true,
  hideParentFolder: boolean = false
): Promise<ExtendedBookmarkTreeNode[]> => {
  if (node.url) {
    return processBookmark(node, includeIconData, dateOptions)
  } else if (node.children) {
    return processFolder(
      node,
      includeIconData,
      dateOptions,
      isOtherBookmarks,
      hideOtherBookmarks,
      hideParentFolder
    )
  }
  return []
}

/**
 * Processes a bookmark (leaf node).
 * @param {ExtendedBookmarkTreeNode} node - The bookmark to process
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array containing the processed bookmark
 */
const processBookmark = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  dateOptions: DateOptions
): Promise<ExtendedBookmarkTreeNode[]> => {
  const processedNode: ExtendedBookmarkTreeNode = { ...node }

  if (!dateOptions.includeDateAdded) {
    delete processedNode.dateAdded
  } else {
    processedNode.dateAdded = toSeconds(node.dateAdded)
  }

  if (!dateOptions.includeDateLastUsed) {
    delete processedNode.dateLastUsed
  } else if (node.dateLastUsed) {
    processedNode.dateLastUsed = toSeconds(node.dateLastUsed)
  }

  if (includeIconData && node.url) {
    processedNode.iconData = await getFaviconBase64(node.url)
  }

  return [processedNode]
}

/**
 * Processes a folder node.
 * @param {ExtendedBookmarkTreeNode} node - The folder node to process
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @param {boolean} isOtherBookmarks - Whether the node is the "Other Bookmarks" folder
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array of processed bookmark nodes
 */
const processFolder = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  dateOptions: DateOptions,
  isOtherBookmarks: boolean,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<ExtendedBookmarkTreeNode[]> => {
  if (hideParentFolder && node.id !== "1" && node.id !== "2") {
    return processChildrenDirectly(
      node,
      includeIconData,
      dateOptions,
      hideOtherBookmarks,
      hideParentFolder
    )
  } else {
    return processFolderWithStructure(
      node,
      includeIconData,
      dateOptions,
      isOtherBookmarks,
      hideOtherBookmarks,
      hideParentFolder
    )
  }
}

/**
 * Processes children of a folder directly, without including the folder itself.
 * @param {ExtendedBookmarkTreeNode} node - The folder node whose children to process
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array of processed child nodes
 */
const processChildrenDirectly = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<ExtendedBookmarkTreeNode[]> => {
  let processedNodes: ExtendedBookmarkTreeNode[] = []
  for (const child of node.children || []) {
    const childNodes = await processNode(
      child,
      includeIconData,
      dateOptions,
      child.id === "2",
      hideOtherBookmarks,
      hideParentFolder
    )
    processedNodes.push(...childNodes)
  }
  return processedNodes
}

/**
 * Processes a folder while maintaining its structure.
 * @param {ExtendedBookmarkTreeNode} node - The folder node to process
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @param {boolean} isOtherBookmarks - Whether the node is the "Other Bookmarks" folder
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array containing the processed folder
 */
const processFolderWithStructure = async (
  node: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  dateOptions: DateOptions,
  isOtherBookmarks: boolean,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<ExtendedBookmarkTreeNode[]> => {
  const processedFolder: ExtendedBookmarkTreeNode = {
    id: node.id,
    title: node.title,
    children: []
  }

  if (dateOptions.includeDateAdded) {
    processedFolder.dateAdded = toSeconds(node.dateAdded)
  }
  
  if (dateOptions.includeDateGroupModified && node.dateGroupModified) {
    processedFolder.dateGroupModified = toSeconds(node.dateGroupModified)
  }

  for (const child of node.children || []) {
    const childNodes = await processNode(
      child,
      includeIconData,
      dateOptions,
      child.id === "2",
      hideOtherBookmarks,
      hideParentFolder
    )
    processedFolder.children.push(...childNodes)
  }

  if (!isOtherBookmarks || !hideOtherBookmarks) {
    return [processedFolder]
  } else {
    return processedFolder.children
  }
}

/**
 * Exports bookmarks to JSON format.
 * @param {ExtendedBookmarkTreeNode[] | null} selectedBookmarks - Specific bookmarks to export, or null for all
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {boolean} includeDateAdded - Whether to include date added information
 * @param {boolean} includeDateLastUsed - Whether to include date last used information
 * @param {boolean} includeDateGroupModified - Whether to include date group modified information
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array of exported bookmark nodes
 */
export const exportToJSON = async (
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null = null,
  includeIconData: boolean = true,
  includeDateAdded: boolean = true,
  includeDateLastUsed: boolean = false,
  includeDateGroupModified: boolean = true,
  hideOtherBookmarks: boolean = true,
  hideParentFolder: boolean = false
): Promise<ExtendedBookmarkTreeNode[]> => {
  const dateOptions: DateOptions = {
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          let processedNodes: ExtendedBookmarkTreeNode[] = []

          if (selectedBookmarks) {
            processedNodes = await processSelectedBookmarks(
              selectedBookmarks,
              includeIconData,
              dateOptions,
              hideOtherBookmarks,
              hideParentFolder
            )
          } else {
            processedNodes = await processAllBookmarks(
              bookmarkTreeNodes[0],
              includeIconData,
              dateOptions,
              hideOtherBookmarks,
              hideParentFolder
            )
          }

          resolve(processedNodes)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Processes selected bookmarks.
 * @param {ExtendedBookmarkTreeNode[]} selectedBookmarks - The bookmarks to process
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array of processed bookmark nodes
 */
const processSelectedBookmarks = async (
  selectedBookmarks: ExtendedBookmarkTreeNode[],
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<ExtendedBookmarkTreeNode[]> => {
  let processedNodes: ExtendedBookmarkTreeNode[] = []
  for (const bookmark of selectedBookmarks) {
    const nodes = await processNode(
      bookmark,
      includeIconData,
      dateOptions,
      bookmark.id === "2",
      hideOtherBookmarks,
      hideParentFolder
    )
    processedNodes.push(...nodes)
  }
  return processedNodes
}

/**
 * Processes all bookmarks from the root node.
 * @param {ExtendedBookmarkTreeNode} rootNode - The root bookmark node
 * @param {boolean} includeIconData - Whether to include favicon data
 * @param {DateOptions} dateOptions - The date options to apply
 * @param {boolean} hideOtherBookmarks - Whether to hide the "Other Bookmarks" folder
 * @param {boolean} hideParentFolder - Whether to hide parent folders
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} Array of processed bookmark nodes
 */
const processAllBookmarks = async (
  rootNode: ExtendedBookmarkTreeNode,
  includeIconData: boolean,
  dateOptions: DateOptions,
  hideOtherBookmarks: boolean,
  hideParentFolder: boolean
): Promise<ExtendedBookmarkTreeNode[]> => {
  return processNode(
    rootNode,
    includeIconData,
    dateOptions,
    false,
    hideOtherBookmarks,
    hideParentFolder
  )
}
