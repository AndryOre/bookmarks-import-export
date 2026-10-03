import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { getReplaceDiff } from './replace-diff'
import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from './testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode, ImportPreview } from './types'

function bookmark(title: string, url: string): ExtendedBookmarkTreeNode {
  return { id: `id-${title}`, title, url, dateAdded: 1, syncing: false }
}

function previewOf(totalCount: number): ImportPreview {
  return {
    format: 'json',
    bookmarksBarCount: totalCount,
    otherBookmarksCount: 0,
    mobileBookmarksCount: 0,
    clearsMobileRoot: false,
    totalCount,
    hasLocationData: true,
  }
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
})

describe('getReplaceDiff', () => {
  it('counts bookmarks in the bar and other roots as removed, and the file total as added', async () => {
    seedFakeBookmarksTree(
      [
        bookmark('A', 'https://a.example/'),
        bookmark('B', 'https://b.example/'),
      ],
      [
        {
          id: 'id-Folder',
          title: 'Folder',
          dateAdded: 1,
          syncing: false,
          children: [bookmark('C', 'https://c.example/')],
        },
      ],
    )

    expect(await getReplaceDiff(previewOf(5))).toEqual({
      removedCount: 3,
      addedCount: 5,
    })
  })

  it('reports zero removed for an empty tree', async () => {
    expect(await getReplaceDiff(previewOf(2))).toEqual({
      removedCount: 0,
      addedCount: 2,
    })
  })

  it('counts a Mobile root holding only folders as removed when the file clears Mobile', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    const folder = await browser.bookmarks.create({
      parentId: '3',
      title: 'Phone folder',
    })
    await browser.bookmarks.create({
      parentId: folder.id,
      title: 'M',
      url: 'https://m.example/',
    })

    const diff = await getReplaceDiff({
      ...previewOf(1),
      clearsMobileRoot: true,
    })

    expect(diff.removedCount).toBe(1)
  })

  it('leaves the Mobile root out of the removed count when the file does not clear it', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    await browser.bookmarks.create({
      parentId: '3',
      title: 'M',
      url: 'https://m.example/',
    })

    const diff = await getReplaceDiff(previewOf(1))

    expect(diff.removedCount).toBe(0)
  })
})
