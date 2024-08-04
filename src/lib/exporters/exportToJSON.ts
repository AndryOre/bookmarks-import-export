/**
 * Extended BookmarkTreeNode type to include possible non-standard properties.
 */
interface ExtendedBookmarkTreeNode extends chrome.bookmarks.BookmarkTreeNode {
  dateGroupModified?: number
  dateLastUsed?: number
  [key: string]: any // Allow any other properties
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
 * Processes a bookmark node and its children, converting timestamps to seconds.
 * @param {ExtendedBookmarkTreeNode} node - The bookmark node to process.
 * @returns {ExtendedBookmarkTreeNode} The processed node with timestamps in seconds.
 */
const processNode = (
  node: ExtendedBookmarkTreeNode
): ExtendedBookmarkTreeNode => {
  const processedNode: ExtendedBookmarkTreeNode = {
    ...node,
    dateAdded: toSeconds(node.dateAdded)
  }

  if (processedNode.dateGroupModified) {
    processedNode.dateGroupModified = toSeconds(processedNode.dateGroupModified)
  }

  if (processedNode.dateLastUsed) {
    processedNode.dateLastUsed = toSeconds(processedNode.dateLastUsed)
  }

  if (processedNode.children) {
    processedNode.children = processedNode.children.map(processNode)
  }

  return processedNode
}

/**
 * Exports bookmarks to JSON format.
 * @returns {Promise<ExtendedBookmarkTreeNode[]>} A promise that resolves to the JSON representation of the bookmarks.
 */
export const exportToJSON = async (): Promise<ExtendedBookmarkTreeNode[]> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const rootNode = bookmarkTreeNodes[0]
          const processedNodes: ExtendedBookmarkTreeNode[] = []

          rootNode.children.forEach((child) => {
            if (child.id === "1") {
              processedNodes.push(processNode(child))
            } else if (child.id === "2") {
              // Add children of "Other bookmarks" directly to the root level
              child.children.forEach((otherChild) => {
                processedNodes.push(processNode(otherChild))
              })
            }
          })

          resolve(processedNodes)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}
