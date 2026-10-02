import type { Browser } from '@wxt-dev/browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { downloadViaOffscreenDocument } from './offscreen-download'
import {
  captureSafetySnapshot,
  readLatestSafetySnapshot,
  restoreSafetySnapshot,
  takeSafetySnapshot,
} from './safety-snapshot'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from './testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode } from './types'

vi.mock('./offscreen-download', () => ({
  downloadViaOffscreenDocument: vi.fn(async () => {}),
}))

const downloadMock = vi.mocked(downloadViaOffscreenDocument)

function bookmark(title: string, url: string): ExtendedBookmarkTreeNode {
  return { id: `id-${title}`, title, url, dateAdded: 1, syncing: false }
}

function folder(
  title: string,
  children: ExtendedBookmarkTreeNode[],
): ExtendedBookmarkTreeNode {
  return { id: `id-${title}`, title, dateAdded: 1, syncing: false, children }
}

function outline(
  nodes: Browser.bookmarks.BookmarkTreeNode[] | undefined,
): unknown[] {
  return (nodes ?? []).map((node) =>
    node.url
      ? { title: node.title, url: node.url }
      : { title: node.title, children: outline(node.children) },
  )
}

function rootOutline(rootId: string): unknown[] {
  const rootChildren = getFakeBookmarksRoot().children ?? []
  const root = rootChildren.find((node) => node.id === rootId)
  return outline(root?.children)
}

function seedSample(): void {
  const deep = folder('Deep', [bookmark('Nested', 'https://nested.example/')])
  seedFakeBookmarksTree(
    [
      bookmark('First', 'https://first.example/'),
      folder('Work', [
        bookmark('Docs', 'https://docs.example/'),
        deep,
        bookmark('Last in work', 'https://work-last.example/'),
      ]),
      bookmark('Third', 'https://third.example/'),
    ],
    [folder('Reading', [bookmark('Article', 'https://article.example/')])],
  )
}

beforeEach(async () => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  downloadMock.mockClear()
  downloadMock.mockResolvedValue()
})

describe('takeSafetySnapshot', () => {
  it('saves a JSON file through the download path and stores the same capture', async () => {
    seedSample()

    const snapshot = await takeSafetySnapshot()

    expect(downloadMock).toHaveBeenCalledTimes(1)
    const [content, mimeType, filename] = downloadMock.mock.calls[0] ?? []
    expect(mimeType).toBe('application/json')
    expect(filename).toMatch(/^snug-safety-snapshot-.+\.json$/)
    expect(JSON.parse(content ?? '')).toEqual(snapshot.roots)
    expect(await readLatestSafetySnapshot()).toEqual(snapshot)
  })

  it('keeps only the latest snapshot', async () => {
    seedSample()
    await takeSafetySnapshot()
    seedFakeBookmarksTree([bookmark('Only', 'https://only.example/')])

    const second = await takeSafetySnapshot()

    expect(await readLatestSafetySnapshot()).toEqual(second)
    expect(second.roots[0]?.children).toHaveLength(1)
  })

  it('throws and keeps the previous snapshot when the download fails', async () => {
    seedSample()
    const first = await takeSafetySnapshot()
    downloadMock.mockRejectedValueOnce(new Error('disk full'))

    await expect(takeSafetySnapshot()).rejects.toThrow()

    expect(await readLatestSafetySnapshot()).toEqual(first)
  })
})

describe('restoreSafetySnapshot', () => {
  it('round-trips nested folders and order after the roots were wiped', async () => {
    seedSample()
    const barBefore = rootOutline('1')
    const otherBefore = rootOutline('2')
    const snapshot = await captureSafetySnapshot()
    seedFakeBookmarksTree([bookmark('Intruder', 'https://intruder.example/')])

    await restoreSafetySnapshot(snapshot)

    expect(rootOutline('1')).toEqual(barBefore)
    expect(rootOutline('2')).toEqual(otherBefore)
  })

  it('takes a new snapshot of the current state before replacing', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()
    seedFakeBookmarksTree([bookmark('Current', 'https://current.example/')])

    await restoreSafetySnapshot(snapshot)

    const stored = await readLatestSafetySnapshot()
    expect(stored?.roots[0]?.children?.[0]?.title).toBe('Current')
  })

  it('deletes nothing when the snapshot cannot be saved', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()
    seedFakeBookmarksTree([bookmark('Current', 'https://current.example/')])
    downloadMock.mockRejectedValueOnce(new Error('blocked'))

    await expect(restoreSafetySnapshot(snapshot)).rejects.toThrow()

    expect(rootOutline('1')).toEqual([
      { title: 'Current', url: 'https://current.example/' },
    ])
  })
})
