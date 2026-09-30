import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'
import Papa from 'papaparse'

import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'
import type { ParsedBookmark } from '@/lib/types'

/**
 * Imports bookmarks from a CSV string with `title`, `url`, and `folder`
 * columns (header names are case-insensitive). Unlike the HTML and JSON
 * importers, this importer has no `ImportMode` parameter and always
 * imports into a reused, localized "Imported bookmarks" folder — it never
 * writes into the browser's bookmarks bar or "Other bookmarks" roots.
 * @param csv The CSV text to import.
 * @returns Resolves once every valid row has been created.
 */
export async function importFromCSV(csv: string): Promise<void> {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join('; '))
  }

  const tree = processCSVData(parsed.data)
  await createBookmarks(tree)
}

/**
 * Builds a folder tree from the flat CSV rows. Rows missing a `title` or
 * `url`, or whose `url` fails `isAllowedBookmarkUrl` validation, are
 * skipped without throwing or rejecting the import — an invalid URL only
 * logs a `console.warn`. Folder path segments (split on `/`) are memoized
 * by their full path so that rows sharing a folder path reuse the same
 * folder node instead of creating duplicates within this batch.
 * @param rows The parsed CSV rows.
 * @returns The resulting folder tree.
 */
function processCSVData(rows: Record<string, string>[]): ParsedBookmark[] {
  const root: ParsedBookmark[] = []
  const folderMemo: Record<string, ParsedBookmark> = {}

  for (const row of rows) {
    const title = row['title']?.trim()
    const url = row['url']?.trim()

    if (!title || !url) continue

    if (!isAllowedBookmarkUrl(url)) {
      console.warn('[importFromCSV] Invalid URL, skipping row:', row)
      continue
    }

    const folderPath = row['folder']?.trim() ?? ''
    const segments = folderPath.split('/').filter(Boolean)

    let currentLevel = root
    let currentPath = ''

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let folder = folderMemo[currentPath]
      if (!folder) {
        folder = {
          title: segment,
          dateAdded: Date.now(),
          dateGroupModified: Date.now(),
          children: [],
        }
        currentLevel.push(folder)
        folderMemo[currentPath] = folder
      }

      currentLevel = folder.children ??= []
    }

    currentLevel.push({ title, url, dateAdded: Date.now() })
  }

  return root
}

/**
 * Creates the tree under a reused "Imported bookmarks" folder. The folder
 * is looked up by its localized title via `browser.bookmarks.search()` so
 * that a folder created under one locale is still found (and reused
 * rather than duplicated) after the browser's locale changes.
 * @param tree The folder tree to create.
 * @returns Resolves once the whole tree has been created.
 */
async function createBookmarks(tree: ParsedBookmark[]): Promise<void> {
  const tree_chrome = await browser.bookmarks.getTree()
  const root = tree_chrome[0]

  if (!root?.children?.[0] || !root.children?.[1]) {
    throw new Error(i18n.t('importFromCSVImportError'))
  }

  const importedFolderTitle = i18n.t('importedBookmarks')
  const existing = await browser.bookmarks.search({
    title: importedFolderTitle,
  })

  let importedFolderId: string

  const existingFolder = existing[0]
  if (existingFolder) {
    importedFolderId = existingFolder.id
  } else {
    const created = await createItem({ title: importedFolderTitle })
    importedFolderId = created.id
  }

  await createBookmarksRecursive(tree, importedFolderId)
}

/**
 * Recursively creates the tree under `parentId`. Individual bookmarks are
 * always created as new nodes, even if a bookmark with the same title and
 * URL already exists. Folders, however, are deduplicated by matching an
 * existing folder with the same title under the same parent and reusing
 * it instead of creating a duplicate.
 * @param nodes The nodes to create.
 * @param parentId The id of the folder to create them under.
 * @returns Resolves once every node has been created.
 */
async function createBookmarksRecursive(
  nodes: ParsedBookmark[],
  parentId: string,
): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      await createItem({ parentId, title: node.title, url: node.url })
    } else if (node.children) {
      const existing = await browser.bookmarks.search({ title: node.title })
      const match = existing.find((r) => r.parentId === parentId && !r.url)

      let folderId: string
      if (match) {
        folderId = match.id
      } else {
        const created = await createItem({ parentId, title: node.title })
        folderId = created.id
      }

      await createBookmarksRecursive(node.children, folderId)
    }
  }
}

function createItem(
  details: Browser.bookmarks.CreateDetails,
): Promise<Browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.create(details)
}
