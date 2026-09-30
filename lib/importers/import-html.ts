import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import {
  resolveImportRoots,
  resolveImportRootTitles,
} from '@/lib/importers/resolve-roots'
import type { ResolvedImportRootTitles } from '@/lib/importers/resolve-roots'
import type { ImportMode, ParsedBookmark } from '@/lib/types'

/**
 * Imports bookmarks from a Netscape-format bookmarks HTML export.
 *
 * `mode` controls where the parsed tree is written:
 * - `'folder'`: creates a new "Imported bookmarks" folder (with its own
 *   "Bookmarks bar" sub-folder) and writes everything under it, leaving
 *   the existing bookmarks bar and "Other bookmarks" untouched.
 * - `'restore-merge'`: writes directly into the existing bookmarks bar and
 *   "Other bookmarks" roots, merging with what's already there.
 * - `'restore-replace'`: destructive — first removes every existing child
 *   of the bookmarks bar and "Other bookmarks" roots, then writes the
 *   parsed tree into them. Existing bookmarks not present in `html` are
 *   permanently lost.
 *
 * Errors thrown by the parse step are re-wrapped as a load error. Errors
 * from the create step are re-wrapped as a create error, unless they
 * already carry the `PROCESS_ERROR` prefix (see `processBookmarks`), in
 * which case they're rethrown as-is so the caller can distinguish a
 * structural failure (e.g. the browser's roots not being present) from an
 * arbitrary `browser.bookmarks.create()` failure.
 * @param html The Netscape-format bookmarks HTML to import.
 * @param mode Where the parsed tree is written.
 * @returns Resolves once the import has finished.
 */
export async function importFromHTML(
  html: string,
  mode: ImportMode = 'folder',
): Promise<void> {
  const tree = await browser.bookmarks.getTree()
  const liveRootTitles = resolveImportRootTitles(tree[0]?.children ?? [])

  let parsed: ParsedBookmark[]

  try {
    parsed = parseHTML(html, liveRootTitles)
  } catch (error) {
    throw new Error(
      i18n.t('importFromHTMLLoadError', [(error as Error).message]),
    )
  }

  try {
    await processBookmarks(parsed, mode, tree)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROCESS_ERROR')) {
      throw error
    }
    throw new Error(
      i18n.t('importFromHTMLCreateError', [(error as Error).message]),
    )
  }
}

/**
 * Parses a Netscape-format bookmarks HTML document into a `ParsedBookmark`
 * tree, using the standard `<DL>`/`<DT>`/`<H3>`/`<A>` structure.
 *
 * Uses `DOMParser`, which is not available in a service worker (e.g. an
 * MV3 background script) — this function must be called from a context
 * that has a `DOMParser` implementation, such as a page or offscreen
 * document.
 *
 * The `<H3 personal_toolbar_folder="true">` attribute is how Netscape-format
 * exports mark the bookmarks bar folder; that folder is mapped to
 * `isBookmarksBar: true` and always placed first in the returned array via
 * `unshift`, regardless of its position in the source document. A top-level
 * `<H3 unfiled_bookmarks_folder="true">` (how Firefox marks its own "Other
 * bookmarks" equivalent) is recognized the same way for Other, and any other
 * top-level `<H3>` is recognized as the Other/Mobile root by a
 * case-insensitive title match — see {@link isKnownOtherTitle} and
 * {@link isKnownMobileTitle} — merging its children into that root instead of
 * nesting a folder for it. Every unmatched top-level bookmark or folder is
 * nested under a synthetic "Other bookmarks" node, unchanged from before.
 * @param html The Netscape-format bookmarks HTML document to parse.
 * @param liveRootTitles The current browser's own root titles (see
 *   `resolveImportRootTitles`), included in the known-title match alongside
 *   the i18n/English-default titles. Omitted when no live browser context is
 *   available (e.g. building an import preview).
 * @returns The parsed bookmark tree.
 */
export function parseHTML(
  html: string,
  liveRootTitles?: ResolvedImportRootTitles,
): ParsedBookmark[] {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const result: ParsedBookmark[] = []
  const otherBookmarks: ParsedBookmark[] = []
  const mobileBookmarks: ParsedBookmark[] = []

  const toolbarH3 = document.querySelector('h3[personal_toolbar_folder="true"]')
  const outerDl =
    document.querySelector('body > dl') ?? document.querySelector('dl')
  if (!outerDl) return result

  const workingDl = toolbarH3?.closest('dl') ?? outerDl

  const topLevelDts = workingDl.querySelectorAll(':scope > dt')

  topLevelDts.forEach((dt) => {
    const firstChild = dt.firstElementChild
    if (!firstChild) return

    if (firstChild.tagName === 'A') {
      otherBookmarks.push(parseBookmarkElement(firstChild as HTMLAnchorElement))
    } else if (firstChild.tagName === 'H3') {
      const h3 = firstChild as HTMLElement
      const isBookmarksBar =
        h3.hasAttribute('personal_toolbar_folder') &&
        h3.getAttribute('personal_toolbar_folder') === 'true'
      const isUnfiled =
        h3.hasAttribute('unfiled_bookmarks_folder') &&
        h3.getAttribute('unfiled_bookmarks_folder') === 'true'

      const folder = parseFolderElement(h3, dt)

      if (isBookmarksBar) {
        folder.isBookmarksBar = true
        result.unshift(folder)
      } else if (isUnfiled || isKnownOtherTitle(folder.title, liveRootTitles)) {
        otherBookmarks.push(...(folder.children ?? []))
      } else if (isKnownMobileTitle(folder.title, liveRootTitles)) {
        mobileBookmarks.push(...(folder.children ?? []))
      } else {
        otherBookmarks.push(folder)
      }
    }
  })

  if (otherBookmarks.length > 0) {
    result.push({
      isOtherBookmarks: true,
      title: i18n.t('otherBookmarks'),
      dateAdded: Date.now(),
      children: otherBookmarks,
    })
  }

  if (mobileBookmarks.length > 0) {
    result.push({
      isMobileBookmarks: true,
      title: i18n.t('mobileBookmarks'),
      dateAdded: Date.now(),
      children: mobileBookmarks,
    })
  }

  return result
}

/**
 * Whether `title` case-insensitively matches a known "Other bookmarks" root
 * title: the current browser's own Other root title (from `liveRootTitles`,
 * when available), the localized `otherBookmarks` i18n string, or the
 * English default "Other bookmarks".
 * @param title The top-level `<H3>` folder title to check.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns Whether `title` identifies the Other bookmarks root.
 */
function isKnownOtherTitle(
  title: string,
  liveRootTitles?: ResolvedImportRootTitles,
): boolean {
  return buildKnownTitleSet(
    liveRootTitles?.otherBookmarksTitle,
    i18n.t('otherBookmarks'),
    'Other bookmarks',
  ).has(title.toLowerCase())
}

/**
 * Whether `title` case-insensitively matches a known Mobile bookmarks root
 * title: the current browser's own Mobile root title (from `liveRootTitles`,
 * when available), the localized `mobileBookmarks` i18n string, or the
 * English default "Mobile bookmarks".
 * @param title The top-level `<H3>` folder title to check.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns Whether `title` identifies the Mobile bookmarks root.
 */
function isKnownMobileTitle(
  title: string,
  liveRootTitles?: ResolvedImportRootTitles,
): boolean {
  return buildKnownTitleSet(
    liveRootTitles?.mobileTitle,
    i18n.t('mobileBookmarks'),
    'Mobile bookmarks',
  ).has(title.toLowerCase())
}

/**
 * Builds a lowercased set of the non-empty candidate titles, for a
 * case-insensitive `Set.has` lookup.
 * @param candidates The candidate titles, some possibly `undefined`.
 * @returns The lowercased, non-empty candidate titles.
 */
function buildKnownTitleSet(
  ...candidates: (string | undefined)[]
): Set<string> {
  return new Set(
    candidates
      .filter((title): title is string => !!title)
      .map((title) => title.toLowerCase()),
  )
}

/**
 * Parses a single `<A>` element into a bookmark. The `add_date` attribute
 * is a Unix timestamp in seconds (the Netscape export format), so it's
 * multiplied by 1000 to match the millisecond timestamps `Date.now()` and
 * the rest of this codebase use. Falls back to the current time when
 * `add_date` is absent.
 * @param a The anchor element to parse.
 * @returns The parsed bookmark.
 */
function parseBookmarkElement(a: HTMLAnchorElement): ParsedBookmark {
  const dateAddedAttribute = a.getAttribute('add_date')
  return {
    title: a.textContent?.trim() ?? '',
    url: a.getAttribute('href') ?? undefined,
    dateAdded: dateAddedAttribute
      ? parseInt(dateAddedAttribute) * 1000
      : Date.now(),
  }
}

/**
 * Parses an `<H3>` folder heading and its sibling/nested `<DL>` into a
 * folder node, recursing into nested bookmarks and folders. Like
 * `parseBookmarkElement`, `add_date` and `last_modified` are Unix
 * timestamps in seconds and are converted to milliseconds.
 * @param h3 The folder heading element.
 * @param dt The `<DT>` element wrapping `h3` and its sibling/nested `<DL>`.
 * @returns The parsed folder node.
 */
function parseFolderElement(h3: HTMLElement, dt: Element): ParsedBookmark {
  const dateAddedAttribute = h3.getAttribute('add_date')
  const lastModifiedAttribute = h3.getAttribute('last_modified')

  const folder: ParsedBookmark = {
    title: h3.textContent?.trim() ?? '',
    dateAdded: dateAddedAttribute
      ? parseInt(dateAddedAttribute) * 1000
      : Date.now(),
    dateGroupModified: lastModifiedAttribute
      ? parseInt(lastModifiedAttribute) * 1000
      : Date.now(),
    children: [],
  }

  const childDl =
    (dt.querySelector(':scope > dl') as Element | null) ??
    (dt.nextElementSibling?.tagName === 'DL' ? dt.nextElementSibling : null)

  if (childDl) {
    const childDts = childDl.querySelectorAll(':scope > dt')
    childDts.forEach((childDt) => {
      const firstChild = childDt.firstElementChild
      if (!firstChild) return

      if (firstChild.tagName === 'A') {
        folder.children!.push(
          parseBookmarkElement(firstChild as HTMLAnchorElement),
        )
      } else if (firstChild.tagName === 'H3') {
        folder.children!.push(
          parseFolderElement(firstChild as HTMLElement, childDt),
        )
      }
    })
  }

  return folder
}

/**
 * Writes the parsed tree into the browser according to `mode` (see
 * `importFromHTML` for what each mode does).
 *
 * Errors thrown here are prefixed with `'PROCESS_ERROR:'` to signal to
 * `importFromHTML` that they represent a structural failure (missing
 * bookmarks bar / "Other bookmarks" roots) rather than an arbitrary
 * `browser.bookmarks` API failure, so the caller can rethrow them as-is
 * instead of wrapping them in a generic create-error message.
 * @param parsed The parsed bookmark tree to write.
 * @param mode Where and how the tree is written.
 * @param tree The tree snapshot `importFromHTML` already fetched (to resolve
 *   the live root titles for `parseHTML`) — reused here instead of
 *   re-fetching.
 * @returns Resolves once the tree has been written.
 */
async function processBookmarks(
  parsed: ParsedBookmark[],
  mode: ImportMode,
  tree: Browser.bookmarks.BookmarkTreeNode[],
): Promise<void> {
  const root = tree[0]
  const { bookmarksBarId, otherBookmarksId, mobileId } = resolveImportRoots(
    root?.children ?? [],
  )

  if (!bookmarksBarId || !otherBookmarksId) {
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromHTMLProcessError'))
  }

  if (mode === 'folder') {
    const importedFolder = await createItem({
      title: i18n.t('importedBookmarks'),
    })

    const importedBookmarksBar = await createItem({
      parentId: importedFolder.id,
      title: i18n.t('bookmarksBar'),
    })

    for (const bookmark of parsed) {
      if (bookmark.isBookmarksBar) {
        await createBookmarks(bookmark.children ?? [], importedBookmarksBar.id)
      } else if (bookmark.isOtherBookmarks) {
        await createBookmarks(bookmark.children ?? [], importedFolder.id)
      } else if (
        bookmark.isMobileBookmarks &&
        bookmark.children &&
        bookmark.children.length > 0
      ) {
        const importedMobile = await createItem({
          parentId: importedFolder.id,
          title: i18n.t('mobileBookmarks'),
        })
        await createBookmarks(bookmark.children, importedMobile.id)
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
      await removeAllChildren(bookmarksBarId, root)
      await removeAllChildren(otherBookmarksId, root)
      if (hasMobileContent && mobileId) {
        await removeAllChildren(mobileId, root)
      }
    }

    for (const bookmark of parsed) {
      if (bookmark.isBookmarksBar) {
        await createBookmarks(bookmark.children ?? [], bookmarksBarId)
      } else if (bookmark.isOtherBookmarks) {
        await createBookmarks(bookmark.children ?? [], otherBookmarksId)
      } else if (bookmark.isMobileBookmarks) {
        await writeMobileBookmarks(
          bookmark.children ?? [],
          mobileId,
          otherBookmarksId,
        )
      }
    }
  }
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
 * @returns Resolves once the content has been written.
 */
async function writeMobileBookmarks(
  nodes: ParsedBookmark[],
  mobileId: string | undefined,
  otherBookmarksId: string,
): Promise<void> {
  await createBookmarks(nodes, mobileId ?? otherBookmarksId)
}

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
