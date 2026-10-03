import type { Browser } from '@wxt-dev/browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { wasImportRestored } from './import-control'
import { ImportLockHeldError, withImportLock } from './import-lock'
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
  downloadViaOffscreenDocument: vi.fn(async () => 1),
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
  downloadMock.mockResolvedValue(1)
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

async function seedMobile(): Promise<void> {
  await browser.bookmarks.create({
    parentId: '3',
    title: 'On phone',
    url: 'https://phone.example/',
  })
}

describe('Mobile root and non-web URLs', () => {
  it('captures the Mobile root when the browser has one', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    seedSample()
    await seedMobile()

    const snapshot = await captureSafetySnapshot()

    expect(snapshot.roots.map((root) => root.id)).toEqual(['1', '2', '3'])
    expect(snapshot.roots[2]?.children?.[0]?.title).toBe('On phone')
  })

  it('captures only two roots when there is no Mobile root', async () => {
    seedSample()

    const snapshot = await captureSafetySnapshot()

    expect(snapshot.roots.map((root) => root.id)).toEqual(['1', '2'])
  })

  it('restores Mobile content that a replace cleared', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    seedSample()
    await seedMobile()
    const snapshot = await captureSafetySnapshot()
    const mobileNode = (getFakeBookmarksRoot().children ?? []).find(
      (node) => node.id === '3',
    )
    const mobileChildren = mobileNode?.children ?? []
    for (const child of mobileChildren) {
      await browser.bookmarks.removeTree(child.id)
    }
    await browser.bookmarks.create({
      parentId: '3',
      title: 'Later',
      url: 'https://later.example/',
    })

    await restoreSafetySnapshot(snapshot)

    expect(rootOutline('3')).toEqual([
      { title: 'On phone', url: 'https://phone.example/' },
    ])
  })

  it('does not touch Mobile when the snapshot has no Mobile root', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()
    resetFakeBookmarks({ withMobileRoot: true })
    await seedMobile()

    await restoreSafetySnapshot(snapshot)

    expect(rootOutline('3')).toEqual([
      { title: 'On phone', url: 'https://phone.example/' },
    ])
  })

  it('restores javascript: and chrome:// bookmarks', async () => {
    seedFakeBookmarksTree([
      bookmark('Tool', 'javascript:alert(1)'),
      bookmark('Settings', 'chrome://settings'),
      bookmark('Local', 'file:///tmp/a.html'),
    ])
    const snapshot = await captureSafetySnapshot()
    seedFakeBookmarksTree([bookmark('Intruder', 'https://intruder.example/')])

    await restoreSafetySnapshot(snapshot)

    expect(rootOutline('1')).toEqual([
      { title: 'Tool', url: 'javascript:alert(1)' },
      { title: 'Settings', url: 'chrome://settings' },
      { title: 'Local', url: 'file:///tmp/a.html' },
    ])
  })

  it('reports an incomplete restore when a create fails', async () => {
    seedFakeBookmarksTree([
      bookmark('Bad', 'chrome://bad'),
      bookmark('Good', 'https://good.example/'),
    ])
    const snapshot = await captureSafetySnapshot()
    const realCreate = fakeBrowser.bookmarks.create
    fakeBrowser.bookmarks.create = (async (
      details: Browser.bookmarks.CreateDetails,
    ) => {
      if (details.url === 'chrome://bad') throw new Error('rejected')
      return realCreate(details)
    }) as typeof fakeBrowser.bookmarks.create

    await expect(restoreSafetySnapshot(snapshot)).rejects.toThrow()

    expect(rootOutline('1')).toEqual([
      { title: 'Good', url: 'https://good.example/' },
    ])
  })
})

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  return undefined
}

describe('restoreSafetySnapshot rollback and lock', () => {
  it('recovers the pre-restore state when removeTree fails partway', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()
    const barBefore = rootOutline('1')
    const otherBefore = rootOutline('2')
    const realRemoveTree = fakeBrowser.bookmarks.removeTree
    let calls = 0
    fakeBrowser.bookmarks.removeTree = (async (id: string) => {
      calls++
      if (calls === 2) throw new Error('remove failed')
      return realRemoveTree(id)
    }) as typeof fakeBrowser.bookmarks.removeTree

    await expect(restoreSafetySnapshot(snapshot)).rejects.toThrow(
      'remove failed',
    )

    expect(rootOutline('1')).toEqual(barBefore)
    expect(rootOutline('2')).toEqual(otherBefore)
  })

  it('marks the error as restored after an automatic recovery', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()
    const realRemoveTree = fakeBrowser.bookmarks.removeTree
    let calls = 0
    fakeBrowser.bookmarks.removeTree = (async (id: string) => {
      calls++
      if (calls === 2) throw new Error('remove failed')
      return realRemoveTree(id)
    }) as typeof fakeBrowser.bookmarks.removeTree

    const error = await captureRejection(restoreSafetySnapshot(snapshot))

    expect(wasImportRestored(error)).toBe(true)
  })

  it('refuses to run while another import holds the lock', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()
    const before = rootOutline('1')
    let outcome: unknown
    await withImportLock(async () => {
      outcome = await captureRejection(restoreSafetySnapshot(snapshot))
    })

    expect(outcome).toBeInstanceOf(ImportLockHeldError)
    expect(rootOutline('1')).toEqual(before)
    expect(downloadMock).not.toHaveBeenCalled()
  })

  it('releases the lock after finishing', async () => {
    seedSample()
    const snapshot = await captureSafetySnapshot()

    await restoreSafetySnapshot(snapshot)

    await expect(withImportLock(async () => 'free')).resolves.toBe('free')
  })
})
