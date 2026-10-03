import type { Browser } from '@wxt-dev/browser'

/**
 * The three fixed top-level roots a restore-mode import writes into,
 * resolved by {@link resolveImportRoots}. `mobileId` is `undefined` when the
 * current browser has no Mobile bookmarks root (e.g. desktop Chrome) — every
 * caller must fall back to `otherBookmarksId` in that case rather than
 * treat it as a structural failure.
 */
export interface ResolvedImportRoots {
  bookmarksBarId: string | undefined
  otherBookmarksId: string | undefined
  mobileId: string | undefined
}

/**
 * A single node of `browser.bookmarks.getTree()`'s root's `children` — the
 * minimal shape {@link resolveImportRoots} needs from it.
 */
export type RootChildNode = Pick<
  Browser.bookmarks.BookmarkTreeNode,
  'id' | 'folderType'
>

/**
 * The current browser's own root titles, resolved by
 * {@link resolveImportRootTitles}. `undefined` fields mean that root
 * couldn't be resolved (e.g. no Mobile root on this browser) — the HTML
 * importer's title-matching falls back to its i18n/English-default titles in
 * that case (see `lib/importers/import-html.ts`).
 */
export interface ResolvedImportRootTitles {
  bookmarksBarTitle: string | undefined
  otherBookmarksTitle: string | undefined
  mobileTitle: string | undefined
}

/**
 * A single node of `browser.bookmarks.getTree()`'s root's `children` — the
 * minimal shape {@link resolveImportRootTitles} needs from it.
 */
export type RootTitleNode = Pick<
  Browser.bookmarks.BookmarkTreeNode,
  'id' | 'folderType' | 'title'
>

/**
 * Resolves one root node from `rootChildren` by, in order: its
 * `folderType` (the browser-assigned semantic marker, when the runtime
 * supports it), then the Chrome-fixed literal id, then its position. The
 * three-step fallback exists because `folderType` is a recent Chrome
 * addition (not yet present on every channel/browser), the fixed ids only
 * hold on Chrome itself, and position is the last resort for anything else
 * (e.g. a browser that reorders its roots).
 * @param rootChildren The root node's `children` array to search.
 * @param folderType The `folderType` value that identifies this root.
 * @param fallbackId The Chrome-fixed id that identifies this root.
 * @param fallbackPosition The index this root normally occupies.
 * @returns The resolved node, or `undefined` if none of the three matched.
 */
function resolveRoot<T extends RootChildNode>(
  rootChildren: T[],
  folderType: string,
  fallbackId: string,
  fallbackPosition: number,
): T | undefined {
  return (
    rootChildren.find((node) => node.folderType === folderType) ??
    rootChildren.find((node) => node.id === fallbackId) ??
    rootChildren.at(fallbackPosition)
  )
}

/**
 * Resolves the bookmarks-bar, Other bookmarks, and Mobile bookmarks roots
 * from the bookmarks tree root's `children` — the single source of truth
 * both the HTML and JSON importers' write paths use instead of a positional
 * `children[0]`/`children[1]` lookup. See {@link resolveRoot} for the
 * per-root resolution order.
 * @param rootChildren `browser.bookmarks.getTree()`'s root node's `children`.
 * @returns The resolved bar/Other/Mobile root ids.
 */
export function resolveImportRoots<T extends RootChildNode>(
  rootChildren: T[],
): ResolvedImportRoots {
  const bookmarksBarNode = resolveRoot(rootChildren, 'bookmarks-bar', '1', 0)
  const otherBookmarksNode = resolveRoot(rootChildren, 'other', '2', 1)
  const mobileNode = resolveRoot(rootChildren, 'mobile', '3', 2)

  return {
    bookmarksBarId: bookmarksBarNode?.id,
    otherBookmarksId: otherBookmarksNode?.id,
    mobileId: mobileNode?.id,
  }
}

/**
 * Resolves the bookmarks-bar, Other bookmarks, and Mobile bookmarks roots'
 * own *titles* from the bookmarks tree root's `children`, using the same
 * per-root resolution order as {@link resolveImportRoots} (see
 * {@link resolveRoot}). The HTML importer uses these to recognize a top-level
 * `<H3>` as the Other/Mobile root by a case-insensitive title match, since a
 * Netscape-format export from another browser only carries the root's title,
 * not its `folderType`/fixed id.
 * @param rootChildren `browser.bookmarks.getTree()`'s root node's `children`.
 * @returns The resolved bar/Other/Mobile root titles.
 */
export function resolveImportRootTitles<T extends RootTitleNode>(
  rootChildren: T[],
): ResolvedImportRootTitles {
  const bookmarksBarNode = resolveRoot(rootChildren, 'bookmarks-bar', '1', 0)
  const otherBookmarksNode = resolveRoot(rootChildren, 'other', '2', 1)
  const mobileNode = resolveRoot(rootChildren, 'mobile', '3', 2)

  return {
    bookmarksBarTitle: bookmarksBarNode?.title,
    otherBookmarksTitle: otherBookmarksNode?.title,
    mobileTitle: mobileNode?.title,
  }
}

/**
 * Resolves the root titles of the live bookmark tree, so that import files
 * written by this browser (whose root folders carry its own titles) are
 * recognized as carrying location data.
 * @returns The current browser's root titles.
 */
export async function loadLiveRootTitles(): Promise<ResolvedImportRootTitles> {
  const tree = await browser.bookmarks.getTree()
  return resolveImportRootTitles(tree[0]?.children ?? [])
}
