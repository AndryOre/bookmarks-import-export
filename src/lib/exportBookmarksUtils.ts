// Function to format a timestamp into a human-readable date and time string
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

// Function to export bookmarks with formatted dates
export const exportBookmarks = async (): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      // Fetch the entire bookmarks tree
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError) // Handle error
        } else {
          // Function to format dates within the bookmarks tree
          const formatDatesInTree = (nodes: any[]) => {
            for (const node of nodes) {
              if (node.dateAdded) {
                node.dateAdded = formatDate(node.dateAdded)
              }
              if (node.dateGroupModified) {
                node.dateGroupModified = formatDate(node.dateGroupModified)
              }
              if (node.dateLastUsed) {
                node.dateLastUsed = formatDate(node.dateLastUsed)
              }
              if (node.children) {
                formatDatesInTree(node.children) // Recursively format dates for children
              }
            }
          }

          formatDatesInTree(bookmarkTreeNodes) // Format dates in the entire tree
          resolve(bookmarkTreeNodes) // Resolve with the formatted bookmarks tree
        }
      })
    } catch (error) {
      reject(error) // Handle error
    }
  })
}
