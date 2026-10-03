import { i18n } from '#i18n'
import Papa from 'papaparse'

import { countImportableBookmarks } from '@/lib/count-bookmarks'
import { splitFolderPath, unescapeFormulaField } from '@/lib/csv-escaping'
import { ImportWriter, withImportRollback } from '@/lib/import-control'
import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'
import { applySkipDuplicates } from '@/lib/skip-duplicates'
import type { ImportOptions, ImportResult, ParsedBookmark } from '@/lib/types'

/**
 * Imports bookmarks from a CSV string with `title`, `url`, and `folder`
 * columns (header names are case-insensitive). Unlike the HTML and JSON
 * importers, this importer has no `ImportMode` parameter and always
 * imports into a reused, localized "Imported bookmarks" folder — it never
 * writes into the browser's bookmarks bar or "Other bookmarks" roots.
 * @param csv The CSV text to import.
 * @param options Import options such as Skip duplicates.
 * @returns The import result, including how many rows were skipped because
 *   their address is not supported, or duplicated.
 */
export async function importFromCSV(
  csv: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const { tree: parsedTree, skippedInvalidUrl } = parseCSVTree(csv)
  const liveTree = await browser.bookmarks.getTree()
  const { nodes, skippedDuplicates } = applySkipDuplicates(
    parsedTree,
    liveTree,
    'folder',
    options.skipDuplicates ?? false,
  )
  const writer = new ImportWriter(
    options,
    countImportableBookmarks(nodes),
    skippedDuplicates,
  )
  await withImportRollback(writer, () => createBookmarks(nodes, writer))
  writer.finish()
  return { skippedInvalidUrl, skippedDuplicates }
}

/**
 * Parses CSV text into a folder tree. Rows with the wrong number of fields
 * (`FieldMismatch`) are skipped and counted in `skippedInvalidUrl` rather than
 * failing the import; any other parse error throws.
 * @param csv The CSV text to parse.
 * @returns The folder tree and the count of rows skipped as unusable.
 * @throws {Error} When Papa Parse reports an error other than `FieldMismatch`.
 */
export function parseCSVTree(csv: string): {
  tree: ParsedBookmark[]
  skippedInvalidUrl: number
} {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  })

  const fatalErrors = parsed.errors.filter(
    (error) => error.type !== 'FieldMismatch',
  )
  if (fatalErrors.length > 0) {
    throw new Error(fatalErrors.map((error) => error.message).join('; '))
  }

  const malformedRows = new Set(
    parsed.errors.flatMap((error) =>
      error.row === undefined ? [] : [error.row],
    ),
  )
  const rows = parsed.data.filter((_, index) => !malformedRows.has(index))
  const { tree, skippedInvalidUrl } = processCSVData(rows)
  return { tree, skippedInvalidUrl: skippedInvalidUrl + malformedRows.size }
}

/**
 * Builds a folder tree from the flat CSV rows. Rows whose `url` is missing or
 * fails `isAllowedBookmarkUrl` validation, are
 * skipped without throwing or rejecting the import and are counted. An
 * empty `title` is kept, since icon-only bookmarks export that way. Folder path segments (split on unescaped `/`) are memoized
 * by their full path so that rows sharing a folder path reuse the same
 * folder node instead of creating duplicates within this batch.
 * @param rows The parsed CSV rows.
 * @returns The resulting folder tree and the count of rows skipped because
 *   their `url` is not allowed.
 */
function processCSVData(rows: Record<string, string>[]): {
  tree: ParsedBookmark[]
  skippedInvalidUrl: number
} {
  const root: ParsedBookmark[] = []
  let skippedInvalidUrl = 0
  const folderMemo: Record<string, ParsedBookmark> = {}

  for (const row of rows) {
    const title = unescapeFormulaField(row['title']?.trim() ?? '')
    const url = row['url']?.trim()

    if (!isAllowedBookmarkUrl(url)) {
      skippedInvalidUrl++
      continue
    }

    const folderPath = unescapeFormulaField(row['folder']?.trim() ?? '')
    const segments = splitFolderPath(folderPath)

    let currentLevel = root
    let currentPath = ''

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}\0${segment}` : segment

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

  return { tree: root, skippedInvalidUrl }
}

/**
 * Creates the tree under a reused "Imported bookmarks" folder. The folder
 * is looked up by its localized title via `browser.bookmarks.search()` so
 * that a folder created under one locale is still found (and reused
 * rather than duplicated) after the browser's locale changes.
 * @param tree The folder tree to create.
 * @param writer The writer that creates and journals the nodes.
 * @returns Resolves once the whole tree has been created.
 */
async function createBookmarks(
  tree: ParsedBookmark[],
  writer: ImportWriter,
): Promise<void> {
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

  const existingFolder = existing.find((node) => !node.url)
  if (existingFolder) {
    importedFolderId = existingFolder.id
  } else {
    const created = await writer.create({ title: importedFolderTitle })
    importedFolderId = created.id
  }

  await createBookmarksRecursive(
    tree,
    importedFolderId,
    writer,
    indexFoldersByParent(tree_chrome),
  )
}

type FolderIdsByParent = Map<string, Map<string, string>>

/**
 * Indexes every existing folder by parent id and title in one walk, so reusing
 * a folder is a map lookup instead of a `bookmarks.search` call per folder.
 * The first folder in tree order wins when titles repeat under one parent.
 * @param nodes The live bookmarks tree to index.
 * @param index The map being built, shared across the recursion.
 * @returns A map of parent id to a map of folder title to folder id.
 */
function indexFoldersByParent(
  nodes: Browser.bookmarks.BookmarkTreeNode[],
  index: FolderIdsByParent = new Map(),
): FolderIdsByParent {
  for (const node of nodes) {
    if (node.url || !node.children) continue
    for (const child of node.children) {
      if (child.url || !child.children) continue
      let titles = index.get(node.id)
      if (!titles) {
        titles = new Map()
        index.set(node.id, titles)
      }
      if (!titles.has(child.title)) titles.set(child.title, child.id)
    }
    indexFoldersByParent(node.children, index)
  }
  return index
}

/**
 * Recursively creates the tree under `parentId`. Individual bookmarks are
 * always created as new nodes, even if a bookmark with the same title and
 * URL already exists. Folders, however, are deduplicated by matching an
 * existing folder with the same title under the same parent and reusing
 * it instead of creating a duplicate.
 * @param nodes The nodes to create.
 * @param parentId The id of the folder to create them under.
 * @param writer The writer that creates and journals the nodes.
 * @param existingFolders The existing folders, indexed by parent id and title.
 * @returns Resolves once every node has been created.
 */
async function createBookmarksRecursive(
  nodes: ParsedBookmark[],
  parentId: string,
  writer: ImportWriter,
  existingFolders: FolderIdsByParent,
): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      await writer.create({ parentId, title: node.title, url: node.url })
    } else if (node.children) {
      const matchId = existingFolders.get(parentId)?.get(node.title)

      let folderId: string
      if (matchId) {
        folderId = matchId
      } else {
        const created = await writer.create({ parentId, title: node.title })
        folderId = created.id
      }

      await createBookmarksRecursive(
        node.children,
        folderId,
        writer,
        existingFolders,
      )
    }
  }
}
