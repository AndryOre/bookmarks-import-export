import type { Browser } from '@wxt-dev/browser'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { resetFakeI18n } from '@/lib/testing/fake-i18n'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

/**
 * `@webext-core/fake-browser` (used by `wxt/testing/fake-browser`) does not
 * implement `browser.bookmarks.*` — every method throws "not implemented"
 * and tells callers to mock it themselves. This module provides a minimal
 * in-memory bookmark tree, patched directly onto `fakeBrowser.bookmarks`, so
 * `lib/**` tests can exercise real `browser.bookmarks.create/search/getTree/
 * removeTree` calls end to end.
 *
 * `fakeBrowser.reset()` does not touch `bookmarks` (it only resets APIs that
 * implement `resetState`), so call `resetFakeBookmarks()` alongside it in
 * `beforeEach`.
 */

/**
 * Builds the default in-memory tree: "Bookmarks bar" ("1") and "Other
 * bookmarks" ("2"), plus a "Mobile bookmarks" root ("3") when
 * `shouldIncludeMobileRoot` is set — see {@link resetFakeBookmarks}'s
 * `options.withMobileRoot`, which defaults to `false` so existing tests keep
 * seeing the two-root tree most browsers actually have.
 * @param shouldIncludeMobileRoot Whether to also seed the Mobile root.
 * @param shouldIncludeAccountRoots Whether to also seed a `syncing: true`
 *   account set of roots next to the local ones.
 * @returns The freshly built root node.
 */
function makeDefaultRoot(
  shouldIncludeMobileRoot: boolean,
  shouldIncludeAccountRoots = false,
): ExtendedBookmarkTreeNode {
  const root = makeLocalRoot(shouldIncludeMobileRoot)
  if (shouldIncludeAccountRoots) {
    root.children?.push(...makeAccountRoots(shouldIncludeMobileRoot))
  }
  return root
}

function makeAccountRoots(
  shouldIncludeMobileRoot: boolean,
): ExtendedBookmarkTreeNode[] {
  const roots: [string, string, string][] = [
    ['acct-1', 'Bookmarks bar', 'bookmarks-bar'],
    ['acct-2', 'Other bookmarks', 'other'],
    ...(shouldIncludeMobileRoot
      ? ([['acct-3', 'Mobile bookmarks', 'mobile']] as [
          string,
          string,
          string,
        ][])
      : []),
  ]
  return roots.map(([id, title, folderType], offset) => ({
    id,
    parentId: '0',
    index: 3 + offset,
    title,
    folderType: folderType as 'bookmarks-bar',
    syncing: true,
    dateAdded: Date.now(),
    children: [],
  }))
}

function makeLocalRoot(
  shouldIncludeMobileRoot: boolean,
): ExtendedBookmarkTreeNode {
  return {
    id: '0',
    title: '',
    syncing: false,
    children: [
      {
        id: '1',
        parentId: '0',
        index: 0,
        title: 'Bookmarks bar',
        folderType: 'bookmarks-bar',
        syncing: false,
        dateAdded: Date.now(),
        children: [],
      },
      {
        id: '2',
        parentId: '0',
        index: 1,
        title: 'Other bookmarks',
        folderType: 'other',
        syncing: false,
        dateAdded: Date.now(),
        children: [],
      },
      ...(shouldIncludeMobileRoot
        ? [
            {
              id: '3',
              parentId: '0',
              index: 2,
              title: 'Mobile bookmarks',
              folderType: 'mobile' as const,
              syncing: false,
              dateAdded: Date.now(),
              children: [],
            },
          ]
        : []),
    ],
  }
}

const store: { nextId: number; root: ExtendedBookmarkTreeNode } = {
  nextId: 4,
  root: makeDefaultRoot(false),
}

function findNode(
  id: string,
  node: ExtendedBookmarkTreeNode = store.root,
): ExtendedBookmarkTreeNode | undefined {
  if (node.id === id) return node
  const children = node.children ?? []
  for (const child of children) {
    const found = findNode(id, child as ExtendedBookmarkTreeNode)
    if (found) return found
  }
  return undefined
}

function didDeleteNode(
  id: string,
  node: ExtendedBookmarkTreeNode = store.root,
): boolean {
  if (!node.children) return false
  const index = node.children.findIndex((child) => child.id === id)
  if (index !== -1) {
    node.children.splice(index, 1)
    return true
  }
  for (const child of node.children) {
    if (didDeleteNode(id, child as ExtendedBookmarkTreeNode)) return true
  }
  return false
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

/**
 * Options for {@link resetFakeBookmarks}.
 */
export interface ResetFakeBookmarksOptions {
  /**
   * Also seed a Mobile bookmarks root (id `"3"`, `folderType: "mobile"`),
   * for tests exercising Mobile-aware root resolution. Defaults to `false`.
   */
  withMobileRoot?: boolean
  /**
   * Also seed an account-storage set of roots (ids `"acct-1"`, `"acct-2"` and,
   * with `withMobileRoot`, `"acct-3"`) that share the local roots'
   * `folderType` but carry `syncing: true`, as a signed-in profile has.
   * Defaults to `false`.
   */
  withAccountRoots?: boolean
}

/**
 * Installs an in-memory bookmarks implementation onto `fakeBrowser.bookmarks`
 * and resets it to a fresh tree (root "0" -> "Bookmarks bar" "1" + "Other
 * bookmarks" "2", both empty, plus "Mobile bookmarks" "3" when
 * `options.withMobileRoot` is set). Safe to call repeatedly (e.g. per test).
 * @param options See {@link ResetFakeBookmarksOptions}.
 */
export function resetFakeBookmarks(
  options: ResetFakeBookmarksOptions = {},
): void {
  resetFakeI18n()
  store.nextId = options.withMobileRoot ? 4 : 3
  store.root = makeDefaultRoot(
    options.withMobileRoot ?? false,
    options.withAccountRoots ?? false,
  )

  fakeBrowser.bookmarks.getTree = async () => [clone(store.root)]

  fakeBrowser.bookmarks.create = (async (
    details: Browser.bookmarks.CreateDetails,
  ) => {
    const parentId = details.parentId ?? '2'
    const parent = findNode(parentId)
    if (!parent)
      throw new Error(`Parent bookmark folder not found: ${parentId}`)
    parent.children ??= []

    const node: ExtendedBookmarkTreeNode = {
      id: String(store.nextId++),
      parentId,
      index: parent.children.length,
      title: details.title ?? '',
      syncing: parent.syncing,
      dateAdded: Date.now(),
    }
    if (details.url === undefined) {
      node.children = []
    } else {
      node.url = details.url
    }

    parent.children.push(node)
    return clone(node)
  }) as typeof fakeBrowser.bookmarks.create

  fakeBrowser.bookmarks.search = (async (
    query: string | Browser.bookmarks.SearchQuery,
  ) => {
    const title =
      typeof query === 'object' && query !== null && 'title' in query
        ? query.title
        : undefined

    const results: ExtendedBookmarkTreeNode[] = []
    const visit = (node: ExtendedBookmarkTreeNode) => {
      if (title !== undefined && node.id !== '0' && node.title === title) {
        results.push(clone(node))
      }
      const children = node.children ?? []
      for (const child of children) {
        visit(child as ExtendedBookmarkTreeNode)
      }
    }
    visit(store.root)
    return results
  }) as typeof fakeBrowser.bookmarks.search

  fakeBrowser.bookmarks.removeTree = (async (id: string) => {
    didDeleteNode(id)
  }) as typeof fakeBrowser.bookmarks.removeTree
}

/**
 * Replaces the "Bookmarks bar" (id "1") and "Other bookmarks" (id "2")
 * children directly, for exporter tests that read a pre-built tree.
 * @param bookmarksBarChildren Nodes to seed under "Bookmarks bar".
 * @param otherBookmarksChildren Nodes to seed under "Other bookmarks".
 */
export function seedFakeBookmarksTree(
  bookmarksBarChildren: ExtendedBookmarkTreeNode[],
  otherBookmarksChildren: ExtendedBookmarkTreeNode[] = [],
): void {
  const barNode = findNode('1')
  const otherNode = findNode('2')
  if (!barNode || !otherNode) {
    throw new Error(
      'Fake bookmarks tree not initialized — call resetFakeBookmarks() first',
    )
  }
  barNode.children = bookmarksBarChildren
  otherNode.children = otherBookmarksChildren
}

/**
 * Returns a deep clone of the current in-memory tree's root node.
 * @returns A deep clone of the fake tree's root node.
 */
export function getFakeBookmarksRoot(): ExtendedBookmarkTreeNode {
  return clone(store.root)
}
