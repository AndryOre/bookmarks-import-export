/**
 * Recursively creates bookmarks and folders in Chrome.
 * @param {any[]} nodes - Array of bookmark nodes to create.
 * @param {string} parentId - ID of the parent folder where bookmarks will be created.
 */
const createBookmarks = async (nodes: any[], parentId: string) => {
  for (const node of nodes) {
    if (node.url) {
      try {
        await chrome.bookmarks.create({
          parentId,
          title: node.title,
          url: node.url
        })
      } catch (error) {
        console.error(`Error creating bookmark ${node.title}:`, error)
      }
    } else if (node.children && node.children.length > 0) {
      try {
        const newFolder = await chrome.bookmarks.create({
          parentId,
          title: node.title
        })
        await createBookmarks(node.children, newFolder.id)
      } catch (error) {
        console.error(`Error creating folder ${node.title}:`, error)
      }
    }
  }
}

/**
 * Processes parsed bookmarks and creates them in Chrome's bookmark structure.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTreeNodes - Chrome's existing bookmark tree.
 * @param {any[]} bookmarksData - Array of parsed bookmarks from JSON.
 */
const processBookmarks = async (
  bookmarkTreeNodes: chrome.bookmarks.BookmarkTreeNode[],
  bookmarksData: any[]
) => {
  const bookmarksBar = bookmarkTreeNodes[0].children?.find(
    (child) => child.id === "1"
  )
  const otherBookmarks = bookmarkTreeNodes[0].children?.find(
    (child) => child.id === "2"
  )

  if (!bookmarksBar || !otherBookmarks) {
    throw new Error("Could not find Bookmarks bar or Other bookmarks folder")
  }

  const bookmarksBarData = bookmarksData[0].children?.find(
    (bookmark) => bookmark.id === "1"
  )
  if (bookmarksBarData && bookmarksBarData.children) {
    await createBookmarks(bookmarksBarData.children, bookmarksBar.id)
  }

  const otherBookmarksData = bookmarksData[0].children?.find(
    (bookmark) => bookmark.id === "2"
  )
  if (otherBookmarksData && otherBookmarksData.children) {
    await createBookmarks(otherBookmarksData.children, otherBookmarks.id)
  }
}

/**
 * Imports bookmarks from a JSON object into Chrome's bookmark structure.
 * @param {any[]} bookmarks - The JSON object containing bookmarks to import.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 */
export const importFromJSON = async (bookmarks: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          try {
            await processBookmarks(bookmarkTreeNodes, bookmarks)
            resolve()
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
