// @vitest-environment jsdom
// (the HTML round trip goes through parseHTML(), which needs DOMParser.)
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
URLs of every bookmark (nodes with a `url`) found under `node`, in order.
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
    // A real export -> import cycle round-trips through JSON text (file ->
    // JSON.parse()); exportToJSON's return type isn't ParsedBookmark[] (that's
    // only the importer's *input* shape), but the runtime shape matches once
    // serialized, so this cast documents that boundary rather than papering
    // over an actual mismatch.
    const reparsed = structuredClone(exported) as unknown as ParsedBookmark[]

    resetFakeBookmarks()
    await importFromJSON(reparsed[0]?.children ?? [], 'restore-merge')

    const importedUrls = collectUrls(getFakeBookmarksRoot())
    expect(importedUrls).toEqual(originalUrls)
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
