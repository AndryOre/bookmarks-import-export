import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import type { ImportMode, ParsedBookmark } from '@/lib/types'

/**
 * Imports bookmarks from a previously exported `ParsedBookmark[]` JSON
 * tree. `mode` behaves the same as in `importFromHTML` (`'folder'` writes
 * into a fresh "Imported bookmarks" folder; `'restore-merge'` writes into
 * the existing roots; `'restore-replace'` clears the existing roots
 * first).
 *
 * Note: `preprocessBookmarks` mutates nodes of the `bookmarks` argument
 * in place (it sets `isBookmarksBar`/`isOtherBookmarks` on nodes it
 * finds), so the array passed in should not be reused elsewhere as if it
 * were untouched.
 * @param bookmarks The previously exported bookmark tree to import.
 * @param mode Where and how the tree is written.
 * @returns Resolves once the import has finished.
 */
export async function importFromJSON(
  bookmarks: ParsedBookmark[],
  mode: ImportMode = 'folder',
): Promise<void> {
  try {
    const preprocessed = preprocessBookmarks(bookmarks)
    await processBookmarks(preprocessed, mode)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROCESS_ERROR')) {
      throw new Error(i18n.t('importFromJSONProcessError'))
    }
    throw new Error(
      i18n.t('importFromJSONImportError', [(error as Error).message]),
    )
  }
}

/**
 * Result of scanning one level of the raw JSON tree in
 * `preprocessBookmarks`: the recognized bookmarks-bar/other-bookmarks
 * nodes, any orphaned nodes found at this level, and the children of a
 * virtual root node, if one was found (see `preprocessBookmarks`).
 */
interface PreprocessLevelResult {
  result: ParsedBookmark[]
  orphans: ParsedBookmark[]
  virtualRootChildren: ParsedBookmark[] | undefined
}

/**
 * Decides whether `bookmark` is a virtual root wrapping the real tree,
 * rather than an ordinary top-level folder that belongs in "Other
 * bookmarks" (see `preprocessLevel`). A folder only counts as a virtual
 * root when it is the sole node at its level (so scanning it can't
 * discard any sibling already classified), or when its own children
 * contain an `id === '1'`/`'2'` node (so it demonstrably wraps the real
 * bookmarks bar / "Other bookmarks" pair).
 * @param bookmark The node being considered as a virtual root.
 * @param level The full sibling array `bookmark` was found in.
 * @returns Whether `bookmark` should be unwrapped as a virtual root.
 */
function isVirtualRoot(
  bookmark: ParsedBookmark,
  level: ParsedBookmark[],
): boolean {
  return (
    level.length === 1 ||
    (bookmark.children ?? []).some(
      (child) => child.id === '1' || child.id === '2',
    )
  )
}

/**
 * Scans a single array of sibling nodes and classifies each one:
 * - `id === '1'` is the bookmarks bar (Chrome's fixed id for it); marked
 *   `isBookmarksBar` and moved to the front of `result`.
 * - `id === '2'` is "Other bookmarks" (Chrome's fixed id for it); marked
 *   `isOtherBookmarks` and appended to `result`.
 * - `parentId === '2'` is an orphaned node (exported with a reference to
 *   "Other bookmarks" but not nested under it); collected into `orphans`.
 * - a folder recognized as a virtual root by `isVirtualRoot` has its
 *   children returned via `virtualRootChildren`; scanning of this level
 *   stops there.
 * - any other unclassified node (a folder that isn't a virtual root, or a
 *   bookmark) is collected into `orphans` alongside the true orphans, so
 *   it ends up in the synthetic "Other bookmarks" node rather than
 *   silently discarding whatever else was already classified at this
 *   level.
 * @param level The sibling nodes to scan.
 * @returns The classified nodes, orphans, and any virtual root's children.
 */
function preprocessLevel(level: ParsedBookmark[]): PreprocessLevelResult {
  const result: ParsedBookmark[] = []
  const orphans: ParsedBookmark[] = []
  let virtualRootChildren: ParsedBookmark[] | undefined

  for (const bookmark of level) {
    if (bookmark.id === '1') {
      bookmark.isBookmarksBar = true
      result.unshift(bookmark)
    } else if (bookmark.id === '2') {
      bookmark.isOtherBookmarks = true
      result.push(bookmark)
    } else if (bookmark.parentId === '2') {
      orphans.push(bookmark)
    } else if (bookmark.children && isVirtualRoot(bookmark, level)) {
      virtualRootChildren = bookmark.children as ParsedBookmark[]
      break
    } else {
      orphans.push(bookmark)
    }
  }

  return { result, orphans, virtualRootChildren }
}

/**
 * Normalizes the top-level array of an exported JSON tree down to
 * `[ bookmarksBar?, otherBookmarks? ]`. Handles three shapes a JSON export
 * can arrive in: a virtual root node with `id === '0'` wrapping everything
 * (its children are unwrapped by looping with `currentLevel` reassigned
 * to them, rather than recursing, until a non-wrapping level is found);
 * explicit `id === '1'`/`'2'` nodes for the bookmarks bar and "Other
 * bookmarks"; and orphaned nodes (`parentId === '2'` but not nested under
 * an `id === '2'` node), which are collected into a synthetic "Other
 * bookmarks" node if one wasn't already present in the result.
 * @param bookmarks The raw top-level array from an exported JSON tree.
 * @returns The normalized `[ bookmarksBar?, otherBookmarks? ]` array.
 */
export function preprocessBookmarks(
  bookmarks: ParsedBookmark[],
): ParsedBookmark[] {
  let currentLevel = bookmarks

  for (;;) {
    const { result, orphans, virtualRootChildren } =
      preprocessLevel(currentLevel)

    if (virtualRootChildren) {
      currentLevel = virtualRootChildren
      continue
    }

    if (orphans.length > 0 && result.every((b) => !b.isOtherBookmarks)) {
      result.push({
        id: '2',
        isOtherBookmarks: true,
        title: i18n.t('otherBookmarks'),
        dateAdded: Date.now(),
        children: orphans,
      })
    }

    return result
  }
}

/**
 * Writes the preprocessed tree into the browser according to `mode` (see
 * `importFromJSON`). Errors thrown here are prefixed with
 * `'PROCESS_ERROR:'` so `importFromJSON` can tell a structural failure
 * (missing bookmarks bar / "Other bookmarks" roots) apart from an
 * arbitrary `browser.bookmarks` API failure — see `importFromJSON`'s
 * catch block, which replaces a `PROCESS_ERROR` message with a generic
 * localized one rather than surfacing the raw error.
 * @param parsed The preprocessed bookmark tree to write.
 * @param mode Where and how the tree is written.
 * @returns Resolves once the tree has been written.
 */
async function processBookmarks(
  parsed: ParsedBookmark[],
  mode: ImportMode,
): Promise<void> {
  const tree = await browser.bookmarks.getTree()
  const root = tree[0]

  if (!root?.children?.[0] || !root.children?.[1]) {
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromJSONProcessError'))
  }

  if (mode === 'folder') {
    const importedFolder = await createItem({
      title: i18n.t('importedBookmarks'),
    })

    for (const bookmark of parsed) {
      if (
        bookmark.isBookmarksBar &&
        bookmark.children &&
        bookmark.children.length > 0
      ) {
        const importedBar = await createItem({
          parentId: importedFolder.id,
          title: i18n.t('bookmarksBar'),
        })
        await createBookmarks(bookmark.children, importedBar.id)
      } else if (bookmark.isOtherBookmarks && bookmark.children) {
        await createBookmarks(bookmark.children, importedFolder.id)
      } else if (bookmark.url) {
        await createItem({
          parentId: importedFolder.id,
          title: bookmark.title,
          url: bookmark.url,
        })
      }
    }
  } else {
    const bookmarksBarNode = root.children.at(0)
    const otherBookmarksNode = root.children.at(1)
    const bookmarksBarId = bookmarksBarNode?.id
    const otherBookmarksId = otherBookmarksNode?.id

    if (!bookmarksBarId || !otherBookmarksId) {
      throw new Error('PROCESS_ERROR:' + i18n.t('importFromJSONProcessError'))
    }

    if (mode === 'restore-replace') {
      const bookmarksBarChildren = bookmarksBarNode?.children ?? []
      for (const child of bookmarksBarChildren) {
        await browser.bookmarks.removeTree(child.id)
      }
      const otherBookmarksChildren = otherBookmarksNode?.children ?? []
      for (const child of otherBookmarksChildren) {
        await browser.bookmarks.removeTree(child.id)
      }
    }

    for (const bookmark of parsed) {
      if (bookmark.isBookmarksBar && bookmark.children) {
        await createBookmarks(bookmark.children, bookmarksBarId)
      } else if (bookmark.isOtherBookmarks && bookmark.children) {
        await createBookmarks(bookmark.children, otherBookmarksId)
      } else if (bookmark.url) {
        await createItem({
          parentId: otherBookmarksId,
          title: bookmark.title,
          url: bookmark.url,
        })
      }
    }
  }
}

/**
 * Recursively creates the tree under `parentId`. A folder node with no
 * children (or an empty `children` array) is silently skipped — it is
 * never created in the browser.
 * @param nodes The nodes to create.
 * @param parentId The id of the folder to create them under.
 * @returns Resolves once every node has been created.
 */
async function createBookmarks(
  nodes: ParsedBookmark[],
  parentId: string,
): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      await createItem({ parentId, title: node.title, url: node.url })
    } else if (node.children && node.children.length > 0) {
      const folder = await createItem({ parentId, title: node.title })
      await createBookmarks(node.children, folder.id)
    }
  }
}

function createItem(
  details: Browser.bookmarks.CreateDetails,
): Promise<Browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.create(details)
}
