import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import { countBookmarks } from '@/lib/count-bookmarks'
import {
  ImportCanceledError,
  type ImportControl,
  ImportWriter,
  withImportRollback,
} from '@/lib/import-control'
import { shouldClearMobileRoot } from '@/lib/importers/mobile-root'
import {
  resolveImportRoots,
  resolveImportRootTitles,
} from '@/lib/importers/resolve-roots'
import type { ResolvedImportRootTitles } from '@/lib/importers/resolve-roots'
import { isAllowedBookmarkUrl } from '@/lib/importers/url-validation'
import { applySkipDuplicates } from '@/lib/skip-duplicates'
import type {
  ImportMode,
  ImportOptions,
  ImportResult,
  ParsedBookmark,
} from '@/lib/types'

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
 * @param options Import options such as Skip duplicates.
 * @returns The import result, including how many bookmarks were skipped
 *   because their address is missing or not supported, or duplicated.
 */
export async function importFromHTML(
  html: string,
  mode: ImportMode = 'folder',
  options: ImportOptions = {},
): Promise<ImportResult> {
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
    return await processBookmarks(
      parsed,
      mode,
      tree,
      options.skipDuplicates ?? false,
      options,
    )
  } catch (error) {
    if (error instanceof ImportCanceledError) throw error
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
  return parseHTMLWithLocation(html, liveRootTitles).tree
}

/**
 * Like {@link parseHTML}, but also reports whether the document carried real
 * location data: a toolbar, unfiled, known-Other or known-Mobile marker. A
 * flat export (only top-level bookmarks and unrecognized folders) gets a
 * synthetic Other root but reports `hasLocationData: false`.
 * @param html The Netscape-format bookmarks HTML document to parse.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns The parsed tree and whether a root marker was recognized.
 */
export function parseHTMLWithLocation(
  html: string,
  liveRootTitles?: ResolvedImportRootTitles,
): { tree: ParsedBookmark[]; hasLocationData: boolean } {
  let hasLocationData = false
  const document = new DOMParser().parseFromString(html, 'text/html')
  const result: ParsedBookmark[] = []
  const otherBookmarks: ParsedBookmark[] = []
  const mobileBookmarks: ParsedBookmark[] = []

  const outerDl =
    document.querySelector('body > dl') ?? document.querySelector('dl')
  if (!outerDl) return { tree: result, hasLocationData }

  const nestedToolbarFolders: ParsedBookmark[] = []
  const topLevelDts = outerDl.querySelectorAll(':scope > dt')

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

      const folder = parseFolderElement(h3, dt, nestedToolbarFolders)

      if (isBookmarksBar) {
        hasLocationData = true
        folder.isBookmarksBar = true
        result.unshift(folder)
      } else if (isUnfiled || isKnownOtherTitle(folder.title, liveRootTitles)) {
        hasLocationData = true
        otherBookmarks.push(...(folder.children ?? []))
      } else if (isKnownMobileTitle(folder.title, liveRootTitles)) {
        hasLocationData = true
        mobileBookmarks.push(...(folder.children ?? []))
      } else {
        otherBookmarks.push(folder)
      }
    }
  })

  for (const folder of nestedToolbarFolders) {
    hasLocationData = true
    folder.isBookmarksBar = true
    result.unshift(folder)
  }

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

  return { tree: result, hasLocationData }
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
 * Classifies a top-level folder title as one of the three browser roots by a
 * case-insensitive match against the current browser's own root titles, the
 * localized i18n titles and the English defaults.
 * @param title The top-level folder title to classify.
 * @param liveRootTitles The current browser's own root titles, if available.
 * @returns `'bar'`, `'other'` or `'mobile'`, or `undefined` when `title` is
 *   not a root title.
 */
export function classifyRootTitle(
  title: string,
  liveRootTitles?: ResolvedImportRootTitles,
): 'bar' | 'other' | 'mobile' | undefined {
  const isBar = buildKnownTitleSet(
    liveRootTitles?.bookmarksBarTitle,
    i18n.t('bookmarksBar'),
    'Bookmarks bar',
  ).has(title.toLowerCase())
  if (isBar) return 'bar'
  if (isKnownOtherTitle(title, liveRootTitles)) return 'other'
  return isKnownMobileTitle(title, liveRootTitles) ? 'mobile' : undefined
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
 * `add_date` is absent. The `href` is validated with `isAllowedBookmarkUrl`;
 * a missing, invalid, or disallowed-scheme `href` all result in an
 * `undefined` `url`.
 * @param a The anchor element to parse.
 * @returns The parsed bookmark.
 */
function parseBookmarkElement(a: HTMLAnchorElement): ParsedBookmark {
  const dateAddedAttribute = a.getAttribute('add_date')
  const href = a.getAttribute('href') ?? undefined

  const url = isAllowedBookmarkUrl(href) ? href : undefined

  return {
    title: a.textContent?.trim() ?? '',
    url,
    dateAdded: dateAddedAttribute
      ? parseInt(dateAddedAttribute) * 1000
      : Date.now(),
  }
}

/**
 * Finds the `<DL>` holding a folder's children. The HTML parser closes the
 * `<DT>` at a `<DD>` description, so the `<DL>` may sit inside the `<DT>`,
 * right after it, or inside (or right after) a following `<DD>`.
 * @param dt The `<DT>` element wrapping the folder heading.
 * @returns The child `<DL>`, or `null` when the folder has none.
 */
function findChildDl(dt: Element): Element | null {
  const inside = dt.querySelector(':scope > dl')
  if (inside) return inside
  const next = dt.nextElementSibling
  if (next?.tagName === 'DL') return next
  if (next?.tagName === 'DD') {
    const insideDescription = next.querySelector(':scope > dl')
    if (insideDescription) return insideDescription
    const afterDescription = next.nextElementSibling
    if (afterDescription?.tagName === 'DL') return afterDescription
  }
  return null
}

/**
 * Parses an `<H3>` folder heading and its sibling/nested `<DL>` into a
 * folder node, recursing into nested bookmarks and folders. Like
 * `parseBookmarkElement`, `add_date` and `last_modified` are Unix
 * timestamps in seconds and are converted to milliseconds.
 * @param h3 The folder heading element.
 * @param dt The `<DT>` element wrapping `h3` and its sibling/nested `<DL>`.
 * @param hoistedToolbarFolders Collects any `PERSONAL_TOOLBAR_FOLDER` folder
 *   found nested below this one, so it is lifted out instead of nested.
 * @returns The parsed folder node.
 */
function parseFolderElement(
  h3: HTMLElement,
  dt: Element,
  hoistedToolbarFolders?: ParsedBookmark[],
): ParsedBookmark {
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

  const childDl = findChildDl(dt)

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
        const childH3 = firstChild as HTMLElement
        const childFolder = parseFolderElement(
          childH3,
          childDt,
          hoistedToolbarFolders,
        )
        if (
          hoistedToolbarFolders &&
          childH3.getAttribute('personal_toolbar_folder') === 'true'
        ) {
          hoistedToolbarFolders.push(childFolder)
        } else {
          folder.children!.push(childFolder)
        }
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
 * @param allParsed The parsed bookmark tree to write.
 * @param mode Where and how the tree is written.
 * @param tree The tree snapshot `importFromHTML` already fetched (to resolve
 *   the live root titles for `parseHTML`) — reused here instead of
 *   re-fetching.
 * @param shouldSkipDuplicates Whether to leave out bookmarks that already exist.
 * @param control Progress callback and abort signal.
 * @returns The import result with the skipped-bookmark counts.
 */
async function processBookmarks(
  allParsed: ParsedBookmark[],
  mode: ImportMode,
  tree: Browser.bookmarks.BookmarkTreeNode[],
  shouldSkipDuplicates: boolean,
  control: ImportControl,
): Promise<ImportResult> {
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
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromHTMLProcessError'))
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
          const importedBookmarksBar = await writer.create({
            parentId: importedFolder.id,
            title: i18n.t('bookmarksBar'),
          })
          await createBookmarks(
            bookmark.children,
            importedBookmarksBar.id,
            result,
            writer,
          )
        } else if (bookmark.isOtherBookmarks) {
          await createBookmarks(
            bookmark.children ?? [],
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
        }
      }
    } else {
      const hasMobileContent = parsed.some(
        (bookmark) =>
          bookmark.isMobileBookmarks &&
          bookmark.children &&
          shouldClearMobileRoot(bookmark),
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
        if (bookmark.isBookmarksBar) {
          await createBookmarks(
            bookmark.children ?? [],
            bookmarksBarId,
            result,
            writer,
          )
        } else if (bookmark.isOtherBookmarks) {
          await createBookmarks(
            bookmark.children ?? [],
            otherBookmarksId,
            result,
            writer,
          )
        } else if (bookmark.isMobileBookmarks) {
          await writeMobileBookmarks(
            bookmark.children ?? [],
            mobileId,
            otherBookmarksId,
            result,
            writer,
          )
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
 * with neither a usable `url` nor `children` is a bookmark whose address is
 * missing or not supported; it is skipped and counted in
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
    if (node.url) {
      await writer.create({ parentId, title: node.title, url: node.url })
    } else if (node.children) {
      const folder = await writer.create({ parentId, title: node.title })
      await createBookmarks(node.children, folder.id, result, writer)
    } else {
      result.skippedInvalidUrl++
    }
  }
}
