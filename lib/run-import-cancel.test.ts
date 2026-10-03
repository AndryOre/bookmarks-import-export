// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { ImportCanceledError, type ImportProgress } from './import-control'
import { downloadViaOffscreenDocument } from './offscreen-download'
import { runImport } from './run-import'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from './testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode, ParsedBookmark } from './types'

vi.mock('./offscreen-download', () => ({
  downloadViaOffscreenDocument: vi.fn(async () => 1),
}))

const downloadMock = vi.mocked(downloadViaOffscreenDocument)

function fileBookmarks(count: number): ParsedBookmark[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `New ${index}`,
    url: `https://new.example/${index}`,
    dateAdded: 0,
  }))
}

function jsonFile(count: number): string {
  return JSON.stringify([
    {
      id: '1',
      title: 'Bookmarks bar',
      dateAdded: 0,
      children: [
        {
          title: 'Folder',
          dateAdded: 0,
          children: fileBookmarks(Math.ceil(count / 2)),
        },
      ],
    },
    {
      id: '2',
      title: 'Other bookmarks',
      dateAdded: 0,
      children: fileBookmarks(Math.floor(count / 2)).map((node) => ({
        ...node,
        url: `${node.url}-other`,
      })),
    },
  ])
}

function htmlFile(count: number): string {
  const links = fileBookmarks(count)
    .map((node) => `<DT><A HREF="${node.url}">${node.title}</A>`)
    .join('\n')
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>
<DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3><DL><p>${links}</DL><p></DL>`
}

function csvFile(count: number): string {
  const rows = fileBookmarks(count).map(
    (node) => `${node.title},${node.url},Folder`,
  )
  return ['title,url,folder', ...rows].join('\n')
}

function existing(): ExtendedBookmarkTreeNode[] {
  return [
    {
      id: 'x',
      title: 'Existing',
      url: 'https://existing.example/',
      syncing: false,
    },
    {
      id: 'f',
      title: 'Existing folder',
      syncing: false,
      children: [
        {
          id: 'y',
          title: 'Nested',
          url: 'https://nested.example/',
          syncing: false,
        },
      ],
    },
  ]
}

interface CancelAfter {
  signal: AbortSignal
  restore: () => void
}

function cancelAfter(creations: number): CancelAfter {
  const controller = new AbortController()
  const original = fakeBrowser.bookmarks.create
  const create = original as unknown as (
    details: Browser.bookmarks.CreateDetails,
  ) => Promise<Browser.bookmarks.BookmarkTreeNode>
  let created = 0
  fakeBrowser.bookmarks.create = (async (
    details: Browser.bookmarks.CreateDetails,
  ) => {
    const node = await create(details)
    created++
    if (created === creations) controller.abort()
    return node
  }) as typeof original
  return {
    signal: controller.signal,
    restore: () => {
      fakeBrowser.bookmarks.create = original
    },
  }
}

interface Shape {
  title: string
  url?: string
  children?: Shape[]
}

function shapeOf(node: Browser.bookmarks.BookmarkTreeNode): Shape {
  return {
    title: node.title,
    ...(node.url !== undefined && { url: node.url }),
    ...(node.children && {
      children: node.children.map((child) => shapeOf(child)),
    }),
  }
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  downloadMock.mockReset()
  downloadMock.mockResolvedValue(1)
})

describe('runImport progress', () => {
  it('reports done and total counts per batch and at the end', async () => {
    const events: ImportProgress[] = []

    await runImport(
      jsonFile(60),
      'application/json',
      'restore-merge',
      undefined,
      {
        onProgress: (progress) => {
          events.push(progress)
        },
      },
    )

    expect(events.map(({ done, total }) => [done, total])).toEqual([
      [25, 60],
      [50, 60],
      [60, 60],
    ])
  })

  it('includes how many bookmarks were skipped as duplicates', async () => {
    seedFakeBookmarksTree(existing())
    const events: ImportProgress[] = []
    const file = JSON.stringify([
      {
        id: '1',
        title: 'Bookmarks bar',
        dateAdded: 0,
        children: [
          { title: 'Dup', url: 'https://existing.example', dateAdded: 0 },
          { title: 'New', url: 'https://new.example/1', dateAdded: 0 },
        ],
      },
    ])

    await runImport(file, 'application/json', 'restore-merge', undefined, {
      skipDuplicates: true,
      onProgress: (progress) => {
        events.push(progress)
      },
    })

    expect(events.at(-1)).toEqual({ done: 1, total: 1, skippedDuplicates: 1 })
  })
})

describe('runImport cancel', () => {
  const formats = [
    ['JSON', jsonFile, 'application/json'],
    ['HTML', htmlFile, 'text/html'],
  ] as const

  for (const [label, makeFile, mimeType] of formats) {
    it(`Folder mode removes the folder it created (${label})`, async () => {
      seedFakeBookmarksTree(existing())
      const before = getFakeBookmarksRoot()
      const cancel = cancelAfter(30)

      await expect(
        runImport(makeFile(80), mimeType, 'folder', undefined, {
          signal: cancel.signal,
        }),
      ).rejects.toBeInstanceOf(ImportCanceledError)

      cancel.restore()
      expect(getFakeBookmarksRoot()).toEqual(before)
    })

    it(`Restore-merge removes the bookmarks it created (${label})`, async () => {
      seedFakeBookmarksTree(existing())
      const before = getFakeBookmarksRoot()
      const cancel = cancelAfter(30)

      await expect(
        runImport(makeFile(80), mimeType, 'restore-merge', undefined, {
          signal: cancel.signal,
        }),
      ).rejects.toBeInstanceOf(ImportCanceledError)

      cancel.restore()
      expect(getFakeBookmarksRoot()).toEqual(before)
    })
  }

  it('CSV removes what it created and keeps reused folders as they were', async () => {
    seedFakeBookmarksTree(existing())
    const before = getFakeBookmarksRoot()
    const cancel = cancelAfter(30)

    await expect(
      runImport(csvFile(80), 'text/csv', 'folder', undefined, {
        signal: cancel.signal,
      }),
    ).rejects.toBeInstanceOf(ImportCanceledError)

    cancel.restore()
    expect(getFakeBookmarksRoot()).toEqual(before)
  })

  it('Restore-replace restores the Safety snapshot', async () => {
    seedFakeBookmarksTree(existing())
    const before = shapeOf(getFakeBookmarksRoot())
    const cancel = cancelAfter(30)

    await expect(
      runImport(
        jsonFile(80),
        'application/json',
        'restore-replace',
        undefined,
        {
          signal: cancel.signal,
        },
      ),
    ).rejects.toBeInstanceOf(ImportCanceledError)

    cancel.restore()
    expect(shapeOf(getFakeBookmarksRoot())).toEqual(before)
  })

  it('Restore-replace cancel brings back Mobile and non-web bookmarks', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    seedFakeBookmarksTree([
      {
        id: 'js',
        title: 'Tool',
        url: 'javascript:alert(1)',
        syncing: false,
      },
      {
        id: 'cs',
        title: 'Settings',
        url: 'chrome://settings',
        syncing: false,
      },
    ])
    await browser.bookmarks.create({
      parentId: '3',
      title: 'On phone',
      url: 'https://phone.example/',
    })
    const before = shapeOf(getFakeBookmarksRoot())
    const file = JSON.stringify([
      {
        id: '1',
        title: 'Bookmarks bar',
        dateAdded: 0,
        children: fileBookmarks(40),
      },
      {
        id: '3',
        title: 'Mobile bookmarks',
        dateAdded: 0,
        children: [
          { title: 'New mobile', url: 'https://m.example/', dateAdded: 0 },
        ],
      },
    ])
    const cancel = cancelAfter(20)

    await expect(
      runImport(file, 'application/json', 'restore-replace', undefined, {
        signal: cancel.signal,
      }),
    ).rejects.toBeInstanceOf(ImportCanceledError)

    cancel.restore()
    expect(shapeOf(getFakeBookmarksRoot())).toEqual(before)
  })

  it('still rejects non-allowed schemes from an untrusted file', async () => {
    const file = JSON.stringify([
      {
        id: '1',
        title: 'Bookmarks bar',
        dateAdded: 0,
        children: [
          { title: 'Tool', url: 'javascript:alert(1)', dateAdded: 0 },
          { title: 'Ok', url: 'https://ok.example/', dateAdded: 0 },
        ],
      },
    ])

    const result = await runImport(file, 'application/json', 'restore-merge')

    expect(result.skippedInvalidUrl).toBe(1)
    const bar = (getFakeBookmarksRoot().children ?? [])[0]
    expect(shapeOf(bar!).children).toEqual([
      { title: 'Ok', url: 'https://ok.example/' },
    ])
  })

  it('leaves everything untouched when canceled before writing starts', async () => {
    seedFakeBookmarksTree(existing())
    const before = getFakeBookmarksRoot()
    const controller = new AbortController()
    controller.abort()

    await expect(
      runImport(
        jsonFile(10),
        'application/json',
        'restore-replace',
        undefined,
        {
          signal: controller.signal,
        },
      ),
    ).rejects.toBeInstanceOf(ImportCanceledError)

    expect(getFakeBookmarksRoot()).toEqual(before)
  })
})
