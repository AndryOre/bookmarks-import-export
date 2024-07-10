export const importBookmarks = async (bookmarks: any[]): Promise<void> => {
  // Function to create bookmarks and folders recursively
  const createBookmarks = async (nodes: any[], parentId: string) => {
    for (const node of nodes) {
      if (node.url) {
        await createBookmark(node, parentId) // Create a bookmark
      } else if (node.children && node.title) {
        await createFolder(node, parentId) // Create a folder
      }
    }
  }

  // Function to create a single bookmark
  const createBookmark = async (node: any, parentId: string) => {
    if (node.title) {
      await chrome.bookmarks.create({
        parentId,
        title: node.title,
        url: node.url
      })
    }
  }

  // Function to create a folder and recursively create its children
  const createFolder = async (node: any, parentId: string) => {
    if (node.title) {
      const newFolder = await chrome.bookmarks.create({
        parentId,
        title: node.title
      })
      await createBookmarks(node.children, newFolder.id)
    }
  }

  // Function to process and create bookmarks in "Bookmarks bar" and "Other bookmarks"
  const processBookmarks = async (
    bookmarkTreeNodes: any[],
    bookmarksData: any[]
  ) => {
    const bookmarksBar = bookmarkTreeNodes[0].children.find(
      (child) => child.title === "Bookmarks bar"
    )
    const otherBookmarks = bookmarkTreeNodes[0].children.find(
      (child) => child.title === "Other bookmarks"
    )

    const bookmarksBarData = bookmarksData[0].children.find(
      (bookmark) => bookmark.title === "Bookmarks bar"
    )
    if (bookmarksBar && bookmarksBarData && bookmarksBarData.children) {
      await createBookmarks(bookmarksBarData.children, bookmarksBar.id)
    }

    const otherBookmarksData = bookmarksData[0].children.find(
      (bookmark) => bookmark.title === "Other bookmarks"
    )
    if (otherBookmarks && otherBookmarksData && otherBookmarksData.children) {
      await createBookmarks(otherBookmarksData.children, otherBookmarks.id)
    }
  }

  // Main function to import bookmarks
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError) // Handle error
        } else {
          await processBookmarks(bookmarkTreeNodes, bookmarks) // Process and create bookmarks
          resolve()
        }
      })
    } catch (error) {
      reject(error) // Handle error
    }
  })
}
