// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { importFromCSV } from '@/lib/importers/import-csv'
import { importFromHTML } from '@/lib/importers/import-html'
import { importFromJSON } from '@/lib/importers/import-json'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode, ParsedBookmark } from '@/lib/types'

const exportOptions = {
  selectedBookmarks: null,
  includeIconData: false,
  includeDateAdded: false,
  includeDateLastUsed: false,
  includeDateGroupModified: false,
  hideOtherBookmarks: false,
  hideParentFolder: false,
}

function seedSourceTree(): void {
  seedFakeBookmarksTree(
    [
      {
        id: '10',
        parentId: '1',
        title: 'Dev',
        syncing: false,
        children: [
          {
            id: '11',
            parentId: '10',
            title: 'Repo',
            url: 'https://github.example/repo',
            syncing: false,
          },
        ],
      },
      {
        id: '12',
        parentId: '1',
        title: 'Docs',
        url: 'https://docs.example',
        syncing: false,
      },
    ],
    [
      {
        id: '20',
        parentId: '2',
        title: 'Reading list',
        url: 'https://reading.example',
        syncing: false,
      },
    ],
  )
}

/**
 * Collects the URLs of every bookmark (nodes with a `url`) found under
 * `node`, sorted for order-independent comparison.
 * @param node The subtree to collect bookmark URLs from.
 * @returns The sorted list of bookmark URLs.
 */
function collectUrls(node: ExtendedBookmarkTreeNode | undefined): string[] {
  if (!node) return []
  const urls: string[] = []
  const visit = (n: ExtendedBookmarkTreeNode) => {
    if (n.url) urls.push(n.url)
    const children = n.children ?? []
    for (const child of children) visit(child as ExtendedBookmarkTreeNode)
  }
  visit(node)
  return urls.toSorted((a, b) => a.localeCompare(b))
}

beforeEach(() => {
  resetFakeBookmarks()
})

describe('round trip: JSON', () => {
  it('export -> import (restore-merge) reproduces the same bookmark URLs', async () => {
    seedSourceTree()
    const originalUrls = collectUrls(getFakeBookmarksRoot())

    const exported = await exportToJSON(exportOptions)
    /**
    A real export -> import cycle round-trips through JSON text (file ->
    JSON.parse()); exportToJSON's return type isn't ParsedBookmark[] (that's
    only the importer's *input* shape), but the runtime shape matches once
    serialized, so this cast documents that boundary rather than papering
    over an actual mismatch.
     */
    const reparsed = structuredClone(exported) as unknown as ParsedBookmark[]

    resetFakeBookmarks()
    await importFromJSON(reparsed[0]?.children ?? [], 'restore-merge')

    const importedUrls = collectUrls(getFakeBookmarksRoot())
    expect(importedUrls).toEqual(originalUrls)
  })

  it('export (hideOtherBookmarks) -> import (restore-merge) restores each bookmark under its original root', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Dev',
          syncing: false,
          children: [
            {
              id: '11',
              parentId: '10',
              title: 'Repo',
              url: 'https://github.example/repo',
              syncing: false,
            },
          ],
        },
      ],
      [
        {
          id: '20',
          parentId: '2',
          title: 'Reading',
          syncing: false,
          children: [
            {
              id: '21',
              parentId: '20',
              title: 'Article',
              url: 'https://reading.example/article',
              syncing: false,
            },
          ],
        },
      ],
    )

    const exported = await exportToJSON({
      ...exportOptions,
      hideOtherBookmarks: true,
    })
    const reparsed = structuredClone(exported) as unknown as ParsedBookmark[]

    resetFakeBookmarks()
    await importFromJSON(reparsed[0]?.children ?? [], 'restore-merge')

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1') as
      ExtendedBookmarkTreeNode | undefined
    const other = root.children?.find((n) => n.id === '2') as
      ExtendedBookmarkTreeNode | undefined

    expect(collectUrls(bar)).toEqual(['https://github.example/repo'])
    expect(collectUrls(other)).toEqual(['https://reading.example/article'])
  })
})

function seedEmptyFolderTree(): void {
  seedFakeBookmarksTree(
    [
      {
        id: '10',
        parentId: '1',
        title: 'Nothing here',
        syncing: false,
        children: [],
      },
    ],
    [],
  )
}

describe('round trip: empty folders', () => {
  it('JSON export -> import -> export keeps an empty folder', async () => {
    seedEmptyFolderTree()
    const exported = await exportToJSON(exportOptions)
    const reparsed = structuredClone(exported) as unknown as ParsedBookmark[]

    resetFakeBookmarks()
    await importFromJSON(reparsed[0]?.children ?? [], 'restore-merge')

    const bar = getFakeBookmarksRoot().children?.find((n) => n.id === '1')
    expect(bar?.children?.map((n) => n.title)).toEqual(['Nothing here'])
    expect(bar?.children?.[0]?.children).toEqual([])
  })

  it('HTML export -> import -> export keeps an empty folder', async () => {
    seedEmptyFolderTree()
    const html = await exportToHTML(exportOptions)

    resetFakeBookmarks()
    await importFromHTML(html, 'restore-merge')

    const bar = getFakeBookmarksRoot().children?.find((n) => n.id === '1')
    expect(bar?.children?.map((n) => n.title)).toEqual(['Nothing here'])
    expect(bar?.children?.[0]?.children).toEqual([])
  })
})

describe('round trip: HTML', () => {
  it('export -> import (restore-merge) reproduces the same bookmark URLs', async () => {
    seedSourceTree()
    const originalUrls = collectUrls(getFakeBookmarksRoot())

    const html = await exportToHTML(exportOptions)

    resetFakeBookmarks()
    await importFromHTML(html, 'restore-merge')

    const importedUrls = collectUrls(getFakeBookmarksRoot())
    expect(importedUrls).toEqual(originalUrls)
  })
})

describe('round trip: CSV', () => {
  it('export -> import reproduces the same bookmark URLs', async () => {
    seedSourceTree()
    const originalUrls = collectUrls(getFakeBookmarksRoot())

    const csv = await exportToCSV({
      selectedBookmarks: null,
      includeIconData: false,
      includeDateAdded: false,
      includeDateLastUsed: false,
      hideParentFolder: false,
    })

    resetFakeBookmarks()
    await importFromCSV(csv)

    const importedUrls = collectUrls(getFakeBookmarksRoot())
    expect(importedUrls).toEqual(originalUrls)
  })
})
