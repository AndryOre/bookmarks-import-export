import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import { countBookmarks } from '@/lib/count-bookmarks'
import {
  ImportCanceledError,
  type ImportControl,
  ImportWriter,
  withImportRollback,
} from '@/lib/import-control'
import { resolveImportRoots } from '@/lib/importers/resolve-roots'
import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'
import { applySkipDuplicates } from '@/lib/skip-duplicates'
import type {
  ImportMode,
  ImportOptions,
  ImportResult,
  ParsedBookmark,
} from '@/lib/types'

/**
 * Imports bookmarks from a previously exported `ParsedBookmark[]` JSON
 * tree. `mode` behaves the same as in `importFromHTML` (`'folder'` writes
 * into a fresh "Imported bookmarks" folder; `'restore-merge'` writes into
 * the existing roots; `'restore-replace'` clears the existing roots
 * first).
 *
 * Note: `preprocessBookmarks` mutates nodes of the `bookmarks` argument
 * in place (it sets `isBookmarksBar`/`isOtherBookmarks`/`isMobileBookmarks`
 * on nodes it finds), so the array passed in should not be reused
 * elsewhere as if it were untouched.
 * @param bookmarks The previously exported bookmark tree to import. A single
 *   root object is accepted and treated as a one-element array.
 * @param mode Where and how the tree is written.
 * @param options Import options such as Skip duplicates.
 * @returns The import result, including how many bookmarks were skipped
 *   because their address is not supported, or duplicated.
 */
export async function importFromJSON(
  bookmarks: ParsedBookmark[] | ParsedBookmark,
  mode: ImportMode = 'folder',
  options: ImportOptions = {},
): Promise<ImportResult> {
  try {
    const preprocessed = preprocessBookmarks(normalizeJsonRoot(bookmarks))
    return await processBookmarks(
      preprocessed,
      mode,
      options.skipDuplicates ?? false,
      options,
    )
  } catch (error) {
    if (error instanceof ImportCanceledError) throw error
    if (error instanceof Error && error.message.startsWith('PROCESS_ERROR')) {
      throw new Error(i18n.t('importFromJSONProcessError'))
    }
    throw new Error(
      i18n.t('importFromJSONImportError', [(error as Error).message]),
    )
  }
}

/**
 * Normalizes the parsed root of a JSON export to an array: a file whose root
 * is a single object is treated as a one-element array. The one place this
 * rule lives, shared by the preview and the importer so both agree on count.
 * @param raw The value returned by `JSON.parse` for the file content.
 * @returns The root as an array of nodes.
 */
export function normalizeJsonRoot(raw: unknown): ParsedBookmark[] {
  return (Array.isArray(raw) ? raw : [raw]) as ParsedBookmark[]
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
 * contain an `id === '1'`/`'2'`/`'3'` node (so it demonstrably wraps the
 * real bookmarks bar / "Other bookmarks" / Mobile bookmarks roots).
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
    (bookmark.children ?? []).some((child) =>
      ['1', '2', '3'].includes(child.id ?? ''),
    )
  )
}

/**
 * Scans a single array of sibling nodes and classifies each one:
 * - `id === '1'` is the bookmarks bar (Chrome's fixed id for it); marked
 *   `isBookmarksBar` and moved to the front of `result`.
 * - `id === '2'` is "Other bookmarks" (Chrome's fixed id for it); marked
 *   `isOtherBookmarks` and appended to `result`.
 * - `id === '3'` is Mobile bookmarks (Chrome's fixed id for it, present only
 *   on browsers that have a Mobile root); marked `isMobileBookmarks` and
 *   appended to `result`.
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
    switch (bookmark.id) {
      case '1': {
        bookmark.isBookmarksBar = true
        result.unshift(bookmark)
        continue
      }
      case '2': {
        bookmark.isOtherBookmarks = true
        result.push(bookmark)
        continue
      }
      case '3': {
        bookmark.isMobileBookmarks = true
        result.push(bookmark)
        continue
      }
    }

    if (bookmark.parentId === '2') {
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
 * `[ bookmarksBar?, otherBookmarks?, mobileBookmarks? ]`. Handles three
 * shapes a JSON export can arrive in: a virtual root node with `id === '0'`
 * wrapping everything (its children are unwrapped by looping with
 * `currentLevel` reassigned to them, rather than recursing, until a
 * non-wrapping level is found); explicit `id === '1'`/`'2'`/`'3'` nodes for
 * the bookmarks bar, "Other bookmarks", and Mobile bookmarks; and orphaned
 * nodes (`parentId === '2'` but not nested under an `id === '2'` node),
 * which are collected into a synthetic "Other bookmarks" node if one wasn't
 * already present in the result.
 * @param bookmarks The raw top-level array from an exported JSON tree.
 * @returns The normalized
 *   `[ bookmarksBar?, otherBookmarks?, mobileBookmarks? ]` array.
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
 * @param allParsed The preprocessed bookmark tree to write.
 * @param mode Where and how the tree is written.
 * @param shouldSkipDuplicates Whether to leave out bookmarks that already exist.
 * @param control Progress callback and abort signal.
 * @returns The import result with the skipped-bookmark counts.
 */
async function processBookmarks(
  allParsed: ParsedBookmark[],
  mode: ImportMode,
  shouldSkipDuplicates: boolean,
  control: ImportControl,
): Promise<ImportResult> {
  const tree = await browser.bookmarks.getTree()
  const { nodes: parsed, skippedDuplicates } = applySkipDuplicates(
    allParsed,
    tree,
    mode,
    shouldSkipDuplicates,
  )
  const result: ImportResult = { skippedInvalidUrl: 0, skippedDuplicates }
  const writer = new ImportWriter(
    control,
    countBookmarks(parsed),
    skippedDuplicates,
  )
  const root = tree[0]
  const { bookmarksBarId, otherBookmarksId, mobileId } = resolveImportRoots(
    root?.children ?? [],
  )

  if (!bookmarksBarId || !otherBookmarksId) {
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromJSONProcessError'))
  }

  await withImportRollback(writer, async () => {
    if (mode === 'folder') {
      const importedFolder = await writer.create({
        title: i18n.t('importedBookmarks'),
      })

      for (const bookmark of parsed) {
        if (
          bookmark.isBookmarksBar &&
          bookmark.children &&
          bookmark.children.length > 0
        ) {
          const importedBar = await writer.create({
            parentId: importedFolder.id,
            title: i18n.t('bookmarksBar'),
          })
          await createBookmarks(
            bookmark.children,
            importedBar.id,
            result,
            writer,
          )
        } else if (bookmark.isOtherBookmarks && bookmark.children) {
          await createBookmarks(
            bookmark.children,
            importedFolder.id,
            result,
            writer,
          )
        } else if (
          bookmark.isMobileBookmarks &&
          bookmark.children &&
          bookmark.children.length > 0
        ) {
          const importedMobile = await writer.create({
            parentId: importedFolder.id,
            title: i18n.t('mobileBookmarks'),
          })
          await createBookmarks(
            bookmark.children,
            importedMobile.id,
            result,
            writer,
          )
        } else if (isAllowedBookmarkUrl(bookmark.url)) {
          await writer.create({
            parentId: importedFolder.id,
            title: bookmark.title,
            url: bookmark.url,
          })
        } else if (!bookmark.children) {
          result.skippedInvalidUrl++
        }
      }
    } else {
      const hasMobileContent = parsed.some(
        (bookmark) =>
          bookmark.isMobileBookmarks &&
          bookmark.children &&
          bookmark.children.length > 0,
      )

      if (mode === 'restore-replace') {
        writer.markClearingExisting()
        await removeAllChildren(bookmarksBarId, root)
        await removeAllChildren(otherBookmarksId, root)
        if (hasMobileContent && mobileId) {
          await removeAllChildren(mobileId, root)
        }
      }

      for (const bookmark of parsed) {
        if (bookmark.isBookmarksBar && bookmark.children) {
          await createBookmarks(
            bookmark.children,
            bookmarksBarId,
            result,
            writer,
          )
        } else if (bookmark.isOtherBookmarks && bookmark.children) {
          await createBookmarks(
            bookmark.children,
            otherBookmarksId,
            result,
            writer,
          )
        } else if (bookmark.isMobileBookmarks && bookmark.children) {
          await writeMobileBookmarks(
            bookmark.children,
            mobileId,
            otherBookmarksId,
            result,
            writer,
          )
        } else if (isAllowedBookmarkUrl(bookmark.url)) {
          await writer.create({
            parentId: otherBookmarksId,
            title: bookmark.title,
            url: bookmark.url,
          })
        } else if (!bookmark.children) {
          result.skippedInvalidUrl++
        }
      }
    }
  })
  writer.finish()

  return result
}

/**
 * Removes every existing child of the root node identified by `rootId`, as
 * found in `treeRoot` (the tree snapshot `processBookmarks` already fetched
 * — this never re-fetches). Used by `restore-replace` mode to clear a root
 * before writing the imported tree into it.
 * @param rootId The id of the root whose children should be removed.
 * @param treeRoot The tree root node (`browser.bookmarks.getTree()`'s
 *   `tree[0]`) to look up `rootId`'s current children in.
 * @returns Resolves once every child has been removed.
 */
async function removeAllChildren(
  rootId: string,
  treeRoot: Browser.bookmarks.BookmarkTreeNode | undefined,
): Promise<void> {
  const rootNode = treeRoot?.children?.find((node) => node.id === rootId)
  const children = rootNode?.children ?? []
  for (const child of children) {
    await browser.bookmarks.removeTree(child.id)
  }
}

/**
 * Writes Mobile bookmarks content into the Mobile root when one was
 * resolved, otherwise into "Other bookmarks" (e.g. the current browser has
 * no Mobile root). Does not retry into "Other bookmarks" on a failed Mobile
 * write — `createBookmarks` creates nodes one at a time, so a partial
 * failure there would otherwise leave a duplicated subset of the content in
 * both roots.
 * @param nodes The Mobile bookmarks content to write.
 * @param mobileId The resolved Mobile root id, if any.
 * @param otherBookmarksId The "Other bookmarks" root id to fall back to.
 * @param result The running import result, updated with skipped bookmarks.
 * @param writer The writer that creates and journals the nodes.
 * @returns Resolves once the content has been written.
 */
async function writeMobileBookmarks(
  nodes: ParsedBookmark[],
  mobileId: string | undefined,
  otherBookmarksId: string,
  result: ImportResult,
  writer: ImportWriter,
): Promise<void> {
  await createBookmarks(nodes, mobileId ?? otherBookmarksId, result, writer)
}

/**
 * Recursively creates the tree under `parentId`. A node with a `children`
 * array is a folder and is created even when that array is empty. A node
 * that is neither an allowed bookmark nor a folder is skipped and counted in
 * `result.skippedInvalidUrl`.
 * @param nodes The nodes to create.
 * @param parentId The id of the folder to create them under.
 * @param result The running import result, updated with skipped bookmarks.
 * @param writer The writer that creates and journals the nodes.
 * @returns Resolves once every node has been created.
 */
async function createBookmarks(
  nodes: ParsedBookmark[],
  parentId: string,
  result: ImportResult,
  writer: ImportWriter,
): Promise<void> {
  for (const node of nodes) {
    if (isAllowedBookmarkUrl(node.url)) {
      await writer.create({ parentId, title: node.title, url: node.url })
    } else if (node.children) {
      const folder = await writer.create({ parentId, title: node.title })
      await createBookmarks(node.children, folder.id, result, writer)
    } else {
      result.skippedInvalidUrl++
    }
  }
}
