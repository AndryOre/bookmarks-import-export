import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { getImportPreview } from './import-preview'
import { downloadViaOffscreenDocument } from './offscreen-download'
import { runImport } from './run-import'
import { readLatestSafetySnapshot } from './safety-snapshot'
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
  ]
}

const CSV_FIXTURE = 'title,url\nCSV A,https://csv.example/page\n'

const SINGLE_ROOT_JSON = JSON.stringify({
  id: '1',
  title: 'Bookmarks bar',
  dateAdded: 0,
  children: [
    { title: 'Root A', url: 'https://root-a.example/page', dateAdded: 0 },
    { title: 'Root B', url: 'https://root-b.example/page', dateAdded: 0 },
  ],
})

interface UrlNode {
  url?: string
  children?: UrlNode[]
}

function collectUrls(nodes: UrlNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.url ? [node.url] : []),
    ...collectUrls(node.children ?? []),
  ])
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  downloadMock.mockReset()
  downloadMock.mockResolvedValue(1)
})

describe('runImport', () => {
  it('rejects content whose format cannot be detected', async () => {
    await expect(
      runImport('not a bookmarks file', 'text/plain', 'folder'),
    ).rejects.toThrow()
  })

  it('rejects JSON that does not parse', async () => {
    await expect(
      runImport('{not json', 'application/json', 'folder'),
    ).rejects.toThrow()
  })

  it('imports a JSON file whose root is a single object, matching its preview', async () => {
    const preview = getImportPreview(SINGLE_ROOT_JSON, 'application/json')
    expect(preview.totalCount).toBe(2)

    await runImport(SINGLE_ROOT_JSON, 'application/json', 'restore-merge')

    expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
      'https://root-a.example/page',
      'https://root-b.example/page',
    ])
  })

  it('imports CSV content into a folder regardless of mode', async () => {
    await runImport(CSV_FIXTURE, 'text/csv', 'restore-replace')

    expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
      'https://csv.example/page',
    ])
  })

  describe('Skip duplicates', () => {
    const FILE_JSON = JSON.stringify({
      id: '1',
      title: 'Bookmarks bar',
      dateAdded: 0,
      children: [
        {
          title: 'Existing again',
          // eslint-disable-next-line unicorn/prefer-https -- exercises http/https normalization
          url: 'http://www.existing.example',
          dateAdded: 0,
        },
        { title: 'New', url: 'https://new.example/page', dateAdded: 0 },
        { title: 'New again', url: 'https://new.example/page/', dateAdded: 0 },
      ],
    })

    it('does not create bookmarks that exist or repeat in the file when on', async () => {
      seedFakeBookmarksTree(existing())

      const result = await runImport(
        FILE_JSON,
        'application/json',
        'restore-merge',
        undefined,
        { skipDuplicates: true },
      )

      expect(result.skippedDuplicates).toBe(2)
      expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
        'https://existing.example/',
        'https://new.example/page',
      ])
    })

    it('creates every bookmark when off', async () => {
      seedFakeBookmarksTree(existing())

      const result = await runImport(
        FILE_JSON,
        'application/json',
        'restore-merge',
        undefined,
        { skipDuplicates: false },
      )

      expect(result.skippedDuplicates).toBe(0)
      expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toHaveLength(4)
    })

    it('skips existing bookmarks for CSV in folder mode', async () => {
      seedFakeBookmarksTree(existing())

      const result = await runImport(
        'title,url\nA,https://existing.example\nB,https://b.example\n',
        'text/csv',
        'folder',
        undefined,
        { skipDuplicates: true },
      )

      expect(result.skippedDuplicates).toBe(1)
    })

    it('is ignored in restore-replace', async () => {
      seedFakeBookmarksTree(existing())

      const result = await runImport(
        FILE_JSON,
        'application/json',
        'restore-replace',
        undefined,
        { skipDuplicates: true },
      )

      expect(result.skippedDuplicates).toBe(0)
      expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toHaveLength(3)
    })
  })

  describe('Safety snapshot', () => {
    it('takes a snapshot before a restore-replace and then replaces', async () => {
      seedFakeBookmarksTree(existing())

      await runImport(SINGLE_ROOT_JSON, 'application/json', 'restore-replace')

      expect(downloadMock).toHaveBeenCalledTimes(1)
      const stored = await readLatestSafetySnapshot()
      expect(stored?.roots[0]?.children?.[0]?.url).toBe(
        'https://existing.example/',
      )
      expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
        'https://root-a.example/page',
        'https://root-b.example/page',
      ])
    })

    it('does not delete anything when the snapshot cannot be saved', async () => {
      seedFakeBookmarksTree(existing())
      downloadMock.mockRejectedValueOnce(new Error('blocked'))

      await expect(
        runImport(SINGLE_ROOT_JSON, 'application/json', 'restore-replace'),
      ).rejects.toThrow()

      expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
        'https://existing.example/',
      ])
    })

    it.each(['folder', 'restore-merge'] as const)(
      'does not take a snapshot for %s imports',
      async (mode) => {
        await runImport(SINGLE_ROOT_JSON, 'application/json', mode)

        expect(downloadMock).not.toHaveBeenCalled()
        expect(await readLatestSafetySnapshot()).toBeNull()
      },
    )
  })
})
