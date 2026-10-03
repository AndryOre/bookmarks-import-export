// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { browser } from 'wxt/browser'

import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { exportToXBEL } from '@/lib/exporters/export-xbel'
import { importFromCSV, parseCSVTree } from '@/lib/importers/import-csv'
import { importFromHTML } from '@/lib/importers/import-html'
import { importFromJSON } from '@/lib/importers/import-json'
import { runImport } from '@/lib/run-import'
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

  it('export (Hide Other off, Hide parent on) -> import loses nothing, Mobile included', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    await browser.bookmarks.create({
      parentId: '1',
      title: 'Bar item',
      url: 'https://bar.example',
    })
    await browser.bookmarks.create({
      parentId: '2',
      title: 'Other item',
      url: 'https://other.example',
    })
    const mobileFolder = await browser.bookmarks.create({
      parentId: '3',
      title: 'Phone folder',
    })
    await browser.bookmarks.create({
      parentId: mobileFolder.id,
      title: 'Mobile item',
      url: 'https://mobile.example',
    })
    const originalUrls = collectUrls(getFakeBookmarksRoot())

    const exported = await exportToJSON({
      ...exportOptions,
      hideOtherBookmarks: false,
      hideParentFolder: true,
    })
    const reparsed = structuredClone(exported) as unknown as ParsedBookmark[]

    resetFakeBookmarks({ withMobileRoot: true })
    await importFromJSON(reparsed[0]?.children ?? reparsed, 'restore-merge')

    expect(collectUrls(getFakeBookmarksRoot())).toEqual(originalUrls)
    const mobile = getFakeBookmarksRoot().children?.find((n) => n.id === '3')
    expect(collectUrls(mobile as ExtendedBookmarkTreeNode | undefined)).toEqual(
      ['https://mobile.example'],
    )
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

const csvOptions = {
  selectedBookmarks: null,
  includeIconData: false,
  includeDateAdded: false,
  includeDateLastUsed: false,
  hideParentFolder: false,
}

function seedHostile(): void {
  seedFakeBookmarksTree(
    [
      {
        id: '10',
        parentId: '1',
        title: 'News/Media',
        syncing: false,
        children: [
          {
            id: '11',
            parentId: '10',
            title: '=HYPERLINK("https://evil.example","x")',
            url: 'https://a.example',
            syncing: false,
          },
        ],
      },
      {
        id: '12',
        parentId: '1',
        title: String.raw`back\slash`,
        syncing: false,
        children: [
          {
            id: '13',
            parentId: '12',
            title: '@mention',
            url: 'https://b.example',
            syncing: false,
          },
          {
            id: '14',
            parentId: '12',
            title: '+plus',
            url: 'https://c.example',
            syncing: false,
          },
          {
            id: '15',
            parentId: '12',
            title: '-minus',
            url: 'https://d.example',
            syncing: false,
          },
        ],
      },
      {
        id: '16',
        parentId: '1',
        title: 'ends\\',
        syncing: false,
        children: [
          {
            id: '17',
            parentId: '16',
            title: '\tTabbed',
            url: 'https://e.example',
            syncing: false,
          },
        ],
      },
    ],
    [],
  )
}

describe('round trip: CSV hardening', () => {
  it('escapes formula-leading titles in the CSV text', async () => {
    seedHostile()
    const csv = await exportToCSV(csvOptions)
    expect(csv).toContain('"\'=HYPERLINK(')
    expect(csv).toContain('"\'@mention"')
    expect(csv).toContain('"\'+plus"')
    expect(csv).toContain('"\'-minus"')
    expect(csv).toContain('"\'\tTabbed"')
  })

  it('restores titles and keeps slash and backslash folder names intact', async () => {
    seedHostile()
    const csv = await exportToCSV(csvOptions)
    const { tree } = parseCSVTree(csv)
    const bar = tree[0]
    const folders = bar?.children?.map((folder) => folder.title)
    expect(folders).toEqual(['News/Media', String.raw`back\slash`, 'ends\\'])
    expect(bar?.children?.[0]?.children?.[0]?.title).toBe(
      '=HYPERLINK("https://evil.example","x")',
    )
    expect(bar?.children?.[1]?.children?.map((n) => n.title)).toEqual([
      '@mention',
      '+plus',
      '-minus',
    ])
    expect(bar?.children?.[2]?.children?.[0]?.title).toBe('\tTabbed')
  })

  it('still imports older CSVs with unescaped paths', () => {
    const legacy =
      '"title","url","folder"\r\n"A","https://a.example","One/Two"\r\n"B","https://b.example","C:\\dir"'
    const { tree } = parseCSVTree(legacy)
    expect(tree[0]?.title).toBe('One')
    expect(tree[0]?.children?.[0]?.title).toBe('Two')
    expect(tree[1]?.title).toBe(String.raw`C:\dir`)
  })
})

describe('round trip: XBEL', () => {
  it('export -> import (restore-merge) keeps bookmarks, nesting and order', async () => {
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
            {
              id: '12',
              parentId: '10',
              title: 'Deep',
              syncing: false,
              children: [
                {
                  id: '13',
                  parentId: '12',
                  title: 'Leaf',
                  url: 'https://leaf.example',
                  syncing: false,
                },
              ],
            },
          ],
        },
        {
          id: '14',
          parentId: '1',
          title: 'Second',
          url: 'https://second.example',
          syncing: false,
        },
      ],
      [
        {
          id: '20',
          parentId: '2',
          title: 'Reading',
          url: 'https://reading.example',
          syncing: false,
        },
      ],
    )
    const xbel = await exportToXBEL(exportOptions)

    resetFakeBookmarks()
    await runImport(xbel, 'application/xml', 'restore-merge')

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1')
    const other = root.children?.find((n) => n.id === '2')
    expect(bar?.children?.map((n) => n.title)).toEqual(['Dev', 'Second'])
    const development = bar?.children?.[0]
    expect(development?.children?.map((n) => n.title)).toEqual(['Repo', 'Deep'])
    expect(development?.children?.[1]?.children?.map((n) => n.url)).toEqual([
      'https://leaf.example',
    ])
    expect(collectUrls(other as ExtendedBookmarkTreeNode | undefined)).toEqual([
      'https://reading.example',
    ])
  })
})
