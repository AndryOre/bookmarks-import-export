/**
 * Parses an HTML string of bookmarks and returns a structured array.
 * @param {string} html - The HTML string containing bookmarks.
 * @returns {any[]} An array of parsed bookmark objects.
 */
const parseHTML = (html: string): any[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  const parseNode = (node: Element): any => {
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
      const children = []
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

  const bookmarks = []
  const bookmarksBarNode = doc.querySelector(
    'h3[personal_toolbar_folder="true"]'
  )
  const otherBookmarks = []

  const dlElements = doc.querySelectorAll("body > dl > dt")
  dlElements.forEach((dt) => {
    const parsed = parseNode(dt.firstElementChild)
    if (parsed) {
      if (dt.firstElementChild === bookmarksBarNode) {
        bookmarks.push(parsed)
      } else {
        otherBookmarks.push(parsed)
      }
    }
  })

  if (otherBookmarks.length > 0) {
    bookmarks.push({
      title: "Other bookmarks",
      children: otherBookmarks
    })
  }

  return bookmarks
}

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
 * @param {any[]} parsedBookmarks - Array of parsed bookmarks from HTML.
 */
const processBookmarks = async (
  bookmarkTreeNodes: chrome.bookmarks.BookmarkTreeNode[],
  parsedBookmarks: any[]
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

  for (const bookmark of parsedBookmarks) {
    if (bookmark.id === "1") {
      await createBookmarks(bookmark.children, bookmarksBar.id)
    } else if (bookmark.id === "2") {
      await createBookmarks(bookmark.children, otherBookmarks.id)
    }
  }
}

/**
 * Imports bookmarks from an HTML string into Chrome's bookmark structure.
 * @param {string} html - The HTML string containing bookmarks to import.
 * @returns {Promise<void>} A promise that resolves when the import is complete.
 */
export const importFromHTML = async (html: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const parsedBookmarks = parseHTML(html)
      chrome.bookmarks.getTree(async (bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          try {
            await processBookmarks(bookmarkTreeNodes, parsedBookmarks)
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
