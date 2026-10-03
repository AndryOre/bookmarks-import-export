import type { Browser } from '@wxt-dev/browser'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from '@/lib/testing/fake-bookmarks'
import type { ParsedBookmark } from '@/lib/types'

import { importFromJSON, preprocessBookmarks } from './import-json'

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
})

describe('preprocessBookmarks', () => {
  it('keeps a lone top-level folder instead of unwrapping it as a virtual root', () => {
    const input: ParsedBookmark[] = [
      {
        title: 'Work',
        dateAdded: 0,
        children: [{ title: 'A', url: 'https://a.example/', dateAdded: 0 }],
      },
    ]

    const result = preprocessBookmarks(input)

    expect(result).toHaveLength(1)
    expect(result[0]?.isOtherBookmarks).toBe(true)
    expect(result[0]?.children?.map((child) => child.title)).toEqual(['Work'])
  })

  it('unwraps a lone node whose children carry root folderTypes', () => {
    const input = [
      {
        title: 'Root',
        dateAdded: 0,
        children: [
          {
            title: 'Bar',
            folderType: 'bookmarks-bar',
            dateAdded: 0,
            children: [],
          },
        ],
      },
    ] as ParsedBookmark[]

    const result = preprocessBookmarks(input)

    expect(result).toHaveLength(1)
    expect(result[0]?.isBookmarksBar).toBe(true)
  })

  it('unwraps a virtual root node (id "0") to its children', () => {
    const input: ParsedBookmark[] = [
      {
        id: '0',
        title: '',
        dateAdded: 0,
        children: [
          { id: '1', title: 'Bookmarks bar', dateAdded: 0, children: [] },
        ],
      },
    ]

    const result = preprocessBookmarks(input)

    expect(result).toHaveLength(1)
    expect(result[0]?.isBookmarksBar).toBe(true)
  })

  it('marks id "1" as bookmarks bar and moves it first, id "2" as other bookmarks', () => {
    const input: ParsedBookmark[] = [
      { id: '2', title: 'Other', dateAdded: 0, children: [] },
      { id: '1', title: 'Bar', dateAdded: 0, children: [] },
    ]

    const result = preprocessBookmarks(input)

    expect(result[0]?.id).toBe('1')
    expect(result[0]?.isBookmarksBar).toBe(true)
    expect(result[1]?.id).toBe('2')
    expect(result[1]?.isOtherBookmarks).toBe(true)
  })

  it('synthesizes an "other bookmarks" folder for orphans with parentId "2"', () => {
    const input: ParsedBookmark[] = [
      {
        title: 'Orphan',
        url: 'https://example.com',
        parentId: '2',
        dateAdded: 0,
      },
    ]

    const result = preprocessBookmarks(input)

    expect(result).toHaveLength(1)
    expect(result[0]?.isOtherBookmarks).toBe(true)
    expect(result[0]?.title).toBe('Other bookmarks')
    expect(result[0]?.children?.[0]?.title).toBe('Orphan')
  })

  it('keeps the bookmarks bar intact when a later top-level folder is not a virtual root (default-export shape)', () => {
    const input: ParsedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks bar',
        dateAdded: 0,
        children: [{ title: 'A', url: 'https://a.example', dateAdded: 0 }],
      },
      {
        title: 'Folder A',
        dateAdded: 0,
        children: [{ title: 'B', url: 'https://b.example', dateAdded: 0 }],
      },
      { title: 'Folder B', dateAdded: 0, children: [] },
    ]

    const result = preprocessBookmarks(input)

    const bar = result.find((b) => b.isBookmarksBar)
    expect(bar?.children?.[0]?.url).toBe('https://a.example')

    const other = result.find((b) => b.isOtherBookmarks)
    expect(other?.children?.map((c) => c.title)).toEqual([
      'Folder A',
      'Folder B',
    ])
  })

  it('unwraps a nested wrapper (id "0" root, then a wrapper of root nodes) before classifying', () => {
    const input: ParsedBookmark[] = [
      {
        id: '0',
        title: 'Wrapper',
        dateAdded: 0,
        children: [
          {
            title: 'Inner wrapper',
            dateAdded: 0,
            children: [
              { id: '1', title: 'Bar', dateAdded: 0, children: [] },
              { id: '2', title: 'Other', dateAdded: 0, children: [] },
            ],
          },
        ],
      },
    ]

    const result = preprocessBookmarks(input)

    expect(result[0]?.id).toBe('1')
    expect(result[0]?.isBookmarksBar).toBe(true)
    expect(result[1]?.id).toBe('2')
    expect(result[1]?.isOtherBookmarks).toBe(true)
  })

  it('restores the bookmarks bar from an id "0" root whose Other-bookmarks folders were flattened to the top level', () => {
    const input: ParsedBookmark[] = [
      {
        id: '0',
        title: '',
        dateAdded: 0,
        children: [
          {
            id: '1',
            title: 'Bookmarks bar',
            dateAdded: 0,
            children: [{ title: 'A', url: 'https://a.example', dateAdded: 0 }],
          },
          {
            title: 'Folder A',
            dateAdded: 0,
            children: [{ title: 'B', url: 'https://b.example', dateAdded: 0 }],
          },
        ],
      },
    ]

    const result = preprocessBookmarks(input)

    const bar = result.find((b) => b.isBookmarksBar)
    expect(bar?.children?.[0]?.url).toBe('https://a.example')

    const other = result.find((b) => b.isOtherBookmarks)
    expect(other?.children?.[0]?.title).toBe('Folder A')
  })
})

describe('preprocessBookmarks orphans with an explicit Other node', () => {
  it('appends top-level orphans to the existing Other node', () => {
    const input: ParsedBookmark[] = [
      { id: '2', title: 'Other bookmarks', dateAdded: 0, children: [] },
      { title: 'Stray', url: 'https://stray.example', dateAdded: 0 },
    ]

    const result = preprocessBookmarks(input)

    const other = result.find((b) => b.isOtherBookmarks)
    expect(result).toHaveLength(1)
    expect(other?.children?.map((c) => c.title)).toEqual(['Stray'])
  })
})

describe('importFromJSON non-string titles', () => {
  it('coerces numeric and null titles instead of failing', async () => {
    const input = [
      {
        id: '2',
        title: 'Other bookmarks',
        dateAdded: 0,
        children: [
          { title: 2024, url: 'https://n.example', dateAdded: 0 },
          { title: null, url: 'https://z.example', dateAdded: 0 },
          { title: 7, dateAdded: 0, children: [] },
        ],
      },
    ] as unknown as ParsedBookmark[]

    await expect(importFromJSON(input, 'restore-merge')).resolves.toBeDefined()

    const other = getFakeBookmarksRoot().children?.find((n) => n.id === '2')
    expect(other?.children?.map((c) => c.title)).toEqual(['2024', '', '7'])
  })
})

describe('importFromJSON', () => {
  it('creates an "Imported bookmarks" folder tree in folder mode', async () => {
    const bookmarks: ParsedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks bar',
        isBookmarksBar: true,
        dateAdded: 0,
        children: [{ title: 'A', url: 'https://a.example', dateAdded: 0 }],
      },
      {
        id: '2',
        title: 'Other bookmarks',
        isOtherBookmarks: true,
        dateAdded: 0,
        children: [{ title: 'B', url: 'https://b.example', dateAdded: 0 }],
      },
    ]

    await importFromJSON(bookmarks, 'folder')

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    expect(importedFolder).toBeDefined()

    const importedBar = importedFolder?.children?.find(
      (n) => n.title === 'Bookmarks bar',
    )
    expect(importedBar?.children?.[0]?.url).toBe('https://a.example')

    const importedOther = importedFolder?.children?.find(
      (n) => n.url === 'https://b.example',
    )
    expect(importedOther).toBeDefined()
  })

  it('skips nodes whose url fails allowlist validation, same as a missing url', async () => {
    const bookmarks: ParsedBookmark[] = [
      {
        id: '2',
        title: 'Other bookmarks',
        isOtherBookmarks: true,
        dateAdded: 0,
        children: [
          { title: 'Bare string', url: 'not-a-url', dateAdded: 0 },
          { title: 'Empty', url: '', dateAdded: 0 },
          {
            title: 'Disallowed scheme',
            url: 'javascript:alert(1)',
            dateAdded: 0,
          },
          { title: 'Valid', url: 'https://valid.example', dateAdded: 0 },
        ],
      },
    ]

    const result = await importFromJSON(bookmarks, 'folder')

    expect(result).toEqual({ skippedInvalidUrl: 3, skippedDuplicates: 0 })

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )

    expect(importedFolder?.children).toHaveLength(1)
    expect(importedFolder?.children?.[0]?.url).toBe('https://valid.example')
  })

  it('reports a progress total equal to the bookmarks actually created', async () => {
    const totals: number[] = []
    const bookmarks: ParsedBookmark[] = [
      {
        title: 'Other bookmarks',
        isOtherBookmarks: true,
        dateAdded: 0,
        children: [
          {
            title: 'Disallowed scheme',
            url: 'javascript:alert(1)',
            dateAdded: 0,
          },
          { title: 'Valid', url: 'https://valid.example', dateAdded: 0 },
        ],
      },
    ]

    await importFromJSON(bookmarks, 'folder', {
      onProgress: (progress) => {
        totals.push(progress.total)
      },
    })

    expect(totals.at(-1)).toBe(1)
  })

  it('creates bookmarks directly under the bar/other folders in restore-merge mode', async () => {
    const bookmarks: ParsedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks bar',
        isBookmarksBar: true,
        dateAdded: 0,
        children: [{ title: 'A', url: 'https://a.example', dateAdded: 0 }],
      },
    ]

    await importFromJSON(bookmarks, 'restore-merge')

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1')
    expect(bar?.children?.[0]?.url).toBe('https://a.example')
  })

  it('removes existing children before importing in restore-replace mode', async () => {
    await importFromJSON(
      [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          dateAdded: 0,
          children: [
            { title: 'Old', url: 'https://old.example', dateAdded: 0 },
          ],
        },
      ],
      'restore-merge',
    )

    await importFromJSON(
      [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          dateAdded: 0,
          children: [
            { title: 'New', url: 'https://new.example', dateAdded: 0 },
          ],
        },
      ],
      'restore-replace',
    )

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1')
    const urls = bar?.children?.map((n) => n.url)
    expect(urls).toEqual(['https://new.example'])
  })

  it('preserves nested folder structure', async () => {
    const bookmarks: ParsedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks bar',
        isBookmarksBar: true,
        dateAdded: 0,
        children: [
          {
            title: 'Nested',
            dateAdded: 0,
            children: [
              { title: 'Deep', url: 'https://deep.example', dateAdded: 0 },
            ],
          },
        ],
      },
    ]

    await importFromJSON(bookmarks, 'restore-merge')

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1')
    const nested = bar?.children?.find((n) => n.title === 'Nested')
    expect(nested?.children?.[0]?.url).toBe('https://deep.example')
  })

  it('writes Mobile bookmarks content into the Mobile root when one exists', async () => {
    resetFakeBookmarks({ withMobileRoot: true })

    const bookmarks: ParsedBookmark[] = [
      {
        id: '3',
        title: 'Mobile bookmarks',
        isMobileBookmarks: true,
        dateAdded: 0,
        children: [{ title: 'M', url: 'https://mobile.example', dateAdded: 0 }],
      },
    ]

    await importFromJSON(bookmarks, 'restore-merge')

    const root = getFakeBookmarksRoot()
    const mobile = root.children?.find((n) => n.id === '3')
    expect(mobile?.children?.[0]?.url).toBe('https://mobile.example')
    const other = root.children?.find((n) => n.id === '2')
    expect(other?.children ?? []).toHaveLength(0)
  })

  it('falls back to Other bookmarks when the browser has no Mobile root', async () => {
    const bookmarks: ParsedBookmark[] = [
      {
        id: '3',
        title: 'Mobile bookmarks',
        isMobileBookmarks: true,
        dateAdded: 0,
        children: [{ title: 'M', url: 'https://mobile.example', dateAdded: 0 }],
      },
    ]

    await importFromJSON(bookmarks, 'restore-merge')

    const root = getFakeBookmarksRoot()
    expect(root.children?.some((n) => n.id === '3')).toBe(false)
    const other = root.children?.find((n) => n.id === '2')
    expect(other?.children?.[0]?.url).toBe('https://mobile.example')
  })

  it('leaves an existing Mobile root untouched on restore-replace when the imported file has no Mobile content', async () => {
    resetFakeBookmarks({ withMobileRoot: true })

    await importFromJSON(
      [
        {
          id: '3',
          title: 'Mobile bookmarks',
          isMobileBookmarks: true,
          dateAdded: 0,
          children: [
            {
              title: 'Existing',
              url: 'https://existing.example',
              dateAdded: 0,
            },
          ],
        },
      ],
      'restore-merge',
    )

    await importFromJSON(
      [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          dateAdded: 0,
          children: [
            { title: 'New bar', url: 'https://new-bar.example', dateAdded: 0 },
          ],
        },
      ],
      'restore-replace',
    )

    const root = getFakeBookmarksRoot()
    const mobile = root.children?.find((n) => n.id === '3')
    expect(mobile?.children?.[0]?.url).toBe('https://existing.example')
  })

  it('leaves an existing Mobile root untouched on restore-replace when the imported file carries an empty Mobile node', async () => {
    resetFakeBookmarks({ withMobileRoot: true })

    await importFromJSON(
      [
        {
          id: '3',
          title: 'Mobile bookmarks',
          isMobileBookmarks: true,
          dateAdded: 0,
          children: [
            {
              title: 'Existing',
              url: 'https://existing.example',
              dateAdded: 0,
            },
          ],
        },
      ],
      'restore-merge',
    )

    await importFromJSON(
      [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          dateAdded: 0,
          children: [
            { title: 'New bar', url: 'https://new-bar.example', dateAdded: 0 },
          ],
        },
        {
          id: '3',
          title: 'Mobile bookmarks',
          isMobileBookmarks: true,
          dateAdded: 0,
          children: [],
        },
      ],
      'restore-replace',
    )

    const root = getFakeBookmarksRoot()
    const mobile = root.children?.find((n) => n.id === '3')
    expect(mobile?.children?.[0]?.url).toBe('https://existing.example')
  })

  it('nests a "Mobile bookmarks" subfolder in folder mode when Mobile content is present', async () => {
    const bookmarks: ParsedBookmark[] = [
      {
        id: '3',
        title: 'Mobile bookmarks',
        isMobileBookmarks: true,
        dateAdded: 0,
        children: [{ title: 'M', url: 'https://mobile.example', dateAdded: 0 }],
      },
    ]

    await importFromJSON(bookmarks, 'folder')

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const importedMobile = importedFolder?.children?.find(
      (n) => n.title === 'Mobile bookmarks',
    )
    expect(importedMobile?.children?.[0]?.url).toBe('https://mobile.example')
  })
})

describe('importFromJSON empty folders', () => {
  it('creates a folder that has an empty children array', async () => {
    const result = await importFromJSON(
      [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          dateAdded: 0,
          children: [{ title: 'Empty', dateAdded: 0, children: [] }],
        },
      ],
      'restore-merge',
    )

    expect(result).toEqual({ skippedInvalidUrl: 0, skippedDuplicates: 0 })
    const bar = getFakeBookmarksRoot().children?.find((n) => n.id === '1')
    expect(bar?.children?.map((n) => n.title)).toEqual(['Empty'])
  })
})

describe('importFromJSON trusted restore with a failing folder create', () => {
  const trustedTree: ParsedBookmark[] = [
    {
      id: '1',
      title: 'Bookmarks bar',
      isBookmarksBar: true,
      dateAdded: 0,
      children: [
        {
          title: 'Broken',
          dateAdded: 0,
          children: [
            { title: 'A', url: 'https://a.example/', dateAdded: 0 },
            {
              title: 'Inner',
              dateAdded: 0,
              children: [
                { title: 'B', url: 'https://b.example/', dateAdded: 0 },
              ],
            },
          ],
        },
        { title: 'Fine', url: 'https://fine.example/', dateAdded: 0 },
      ],
    },
  ]

  it('counts every bookmark of the dropped subtree as skipped', async () => {
    const realCreate = fakeBrowser.bookmarks.create
    fakeBrowser.bookmarks.create = (async (
      details: Browser.bookmarks.CreateDetails,
    ) => {
      if (details.title === 'Broken') throw new Error('create failed')
      return realCreate(details)
    }) as typeof fakeBrowser.bookmarks.create

    const result = await importFromJSON(trustedTree, 'restore-merge', {
      trusted: true,
    })

    expect(result.skippedInvalidUrl).toBe(2)
    const bar = getFakeBookmarksRoot().children?.find((n) => n.id === '1')
    expect(bar?.children?.map((n) => n.title)).toEqual(['Fine'])
  })
})
