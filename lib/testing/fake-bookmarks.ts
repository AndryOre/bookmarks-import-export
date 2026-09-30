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

function makeDefaultRoot(): ExtendedBookmarkTreeNode {
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
        syncing: false,
        dateAdded: Date.now(),
        children: [],
      },
      {
        id: '2',
        parentId: '0',
        index: 1,
        title: 'Other bookmarks',
        syncing: false,
        dateAdded: Date.now(),
        children: [],
      },
    ],
  }
}

const store: { nextId: number; root: ExtendedBookmarkTreeNode } = {
  nextId: 3,
  root: makeDefaultRoot(),
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
 * Installs an in-memory bookmarks implementation onto `fakeBrowser.bookmarks`
 * and resets it to a fresh tree (root "0" -> "Bookmarks bar" "1" + "Other
 * bookmarks" "2", both empty). Safe to call repeatedly (e.g. per test).
 */
export function resetFakeBookmarks(): void {
  resetFakeI18n()
  store.nextId = 3
  store.root = makeDefaultRoot()

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
      syncing: false,
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
 */
export function getFakeBookmarksRoot(): ExtendedBookmarkTreeNode {
  return clone(store.root)
}
