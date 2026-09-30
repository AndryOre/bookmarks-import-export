import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

import { exportToJSON } from './export-json'

const baseOptions = {
  includeIconData: false,
  includeDateAdded: false,
  includeDateLastUsed: false,
  includeDateGroupModified: false,
  hideOtherBookmarks: false,
  hideParentFolder: false,
}

beforeEach(() => {
  resetFakeBookmarks()
})

describe('exportToJSON', () => {
  it('exports an empty tree as a root node with empty bar/other folders', async () => {
    const [root] = await exportToJSON({
      selectedBookmarks: null,
      ...baseOptions,
    })

    expect(root).toBeDefined()
    expect(root?.id).toBe('0')
    expect(root?.children?.map((n) => n.id)).toEqual(['1', '2'])
    expect(root?.children?.every((n) => (n.children ?? []).length === 0)).toBe(
      true,
    )
    expect(root).not.toHaveProperty('url')
    expect(root).not.toHaveProperty('parentId')
    expect(root).not.toHaveProperty('index')
  })

  it('exports nested folders and bookmarks, preserving hierarchy and special characters', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Dev & "Tools"',
          syncing: false,
          children: [
            {
              id: '11',
              parentId: '10',
              title: 'Café <résumé>',
              url: 'https://example.com/café?q=1',
              syncing: false,
            },
          ],
        },
      ],
      [
        {
          id: '20',
          parentId: '2',
          title: 'Reading list',
          url: 'https://example.org',
          syncing: false,
        },
      ],
    )

    const [root] = await exportToJSON({
      selectedBookmarks: null,
      ...baseOptions,
    })

    const bar = root?.children?.find((n) => n.id === '1')
    const folder = bar?.children?.[0]
    const bookmark = folder?.children?.[0]
    const other = root?.children?.find((n) => n.id === '2')

    expect(folder?.title).toBe('Dev & "Tools"')
    expect(bookmark?.title).toBe('Café <résumé>')
    expect(bookmark?.url).toBe('https://example.com/café?q=1')
    expect(other?.children?.[0]?.url).toBe('https://example.org')
  })

  it('flattens "Other bookmarks" when hideOtherBookmarks is set', async () => {
    seedFakeBookmarksTree(
      [],
      [
        {
          id: '20',
          parentId: '2',
          title: 'Loose bookmark',
          url: 'https://example.org',
          syncing: false,
        },
      ],
    )

    const [root] = await exportToJSON({
      selectedBookmarks: null,
      ...baseOptions,
      hideOtherBookmarks: true,
    })

    const ids = root?.children?.map((n) => n.id)
    expect(ids).not.toContain('2')
    expect(root?.children?.some((n) => n.url === 'https://example.org')).toBe(
      true,
    )
  })

  it('converts dateAdded from milliseconds to seconds when included', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Timed',
          url: 'https://example.com',
          syncing: false,
          dateAdded: 1_700_000_000_000,
        },
      ],
      [],
    )

    const [root] = await exportToJSON({
      selectedBookmarks: null,
      ...baseOptions,
      includeDateAdded: true,
    })

    const bar = root?.children?.find((n) => n.id === '1')
    const bookmark = bar?.children?.[0] as ExtendedBookmarkTreeNode
    expect(bookmark.dateAdded).toBe(1_700_000_000)
  })

  it('exports only the selected bookmarks when provided explicitly', async () => {
    const selected: ExtendedBookmarkTreeNode[] = [
      {
        id: '99',
        parentId: '2',
        title: 'Only me',
        url: 'https://only.example',
        syncing: false,
      },
    ]

    const [root] = await exportToJSON({
      selectedBookmarks: selected,
      ...baseOptions,
    })

    expect(root?.children).toHaveLength(1)
    expect(root?.children?.[0]?.url).toBe('https://only.example')
  })
})
