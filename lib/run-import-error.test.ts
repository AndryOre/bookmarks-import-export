// @vitest-environment jsdom
import type { Browser } from '@wxt-dev/browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { wasImportRestored } from './import-control'
import { downloadViaOffscreenDocument } from './offscreen-download'
import { runImport } from './run-import'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from './testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode } from './types'

vi.mock('./offscreen-download', () => ({
  downloadViaOffscreenDocument: vi.fn(async () => 1),
}))

const downloadMock = vi.mocked(downloadViaOffscreenDocument)

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

function jsonFile(count: number): string {
  return JSON.stringify([
    {
      id: '1',
      title: 'Bookmarks bar',
      dateAdded: 0,
      children: Array.from({ length: count }, (_, index) => ({
        title: `New ${index}`,
        url: `https://new.example/${index}`,
        dateAdded: 0,
      })),
    },
  ])
}

function failCreateAfter(creations: number): () => void {
  const original = fakeBrowser.bookmarks.create
  const create = original as unknown as (
    details: Browser.bookmarks.CreateDetails,
  ) => Promise<Browser.bookmarks.BookmarkTreeNode>
  let created = 0
  fakeBrowser.bookmarks.create = (async (
    details: Browser.bookmarks.CreateDetails,
  ) => {
    created++
    if (created === creations + 1) throw new Error('create rejected')
    return create(details)
  }) as typeof original
  return () => {
    fakeBrowser.bookmarks.create = original
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

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  return 'resolved'
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  downloadMock.mockReset()
  downloadMock.mockResolvedValue(1)
})

describe('runImport error rollback', () => {
  it('Restore-replace restores the previous bookmarks when a create fails', async () => {
    seedFakeBookmarksTree(existing())
    const before = shapeOf(getFakeBookmarksRoot())
    const restoreCreate = failCreateAfter(5)

    const failure = await failureOf(
      runImport(jsonFile(20), 'application/json', 'restore-replace'),
    )
    restoreCreate()

    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toContain('create rejected')
    expect(wasImportRestored(failure)).toBe(true)
    expect(shapeOf(getFakeBookmarksRoot())).toEqual(before)
  })

  it('Folder mode removes the partial folder when a create fails', async () => {
    seedFakeBookmarksTree(existing())
    const before = getFakeBookmarksRoot()
    const restoreCreate = failCreateAfter(5)

    const failure = await failureOf(
      runImport(jsonFile(20), 'application/json', 'folder'),
    )
    restoreCreate()

    expect((failure as Error).message).toContain('create rejected')
    expect(wasImportRestored(failure)).toBe(false)
    expect(getFakeBookmarksRoot()).toEqual(before)
  })

  it('Restore-merge removes what it created when a create fails', async () => {
    seedFakeBookmarksTree(existing())
    const before = getFakeBookmarksRoot()
    const restoreCreate = failCreateAfter(5)

    const failure = await failureOf(
      runImport(jsonFile(20), 'application/json', 'restore-merge'),
    )
    restoreCreate()

    expect((failure as Error).message).toContain('create rejected')
    expect(getFakeBookmarksRoot()).toEqual(before)
  })
})
