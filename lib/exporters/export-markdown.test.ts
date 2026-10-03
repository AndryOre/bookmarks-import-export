import { beforeEach, describe, expect, it } from 'vitest'

import { ExportCanceledError } from '@/lib/export-control'
import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { exportToMarkdown } from './export-markdown'

const baseOptions = {
  includeDateAdded: false,
  includeDateLastUsed: false,
  includeDateGroupModified: false,
  hideOtherBookmarks: false,
  hideParentFolder: false,
}

beforeEach(() => {
  resetFakeBookmarks()
})

describe('exportToMarkdown', () => {
  it('lists the empty root folders for an empty tree', async () => {
    expect(
      await exportToMarkdown({ selectedBookmarks: null, ...baseOptions }),
    ).toBe('- Bookmarks bar\n- Other bookmarks\n')
  })

  it('nests folders as indented bullets and keeps empty folders', async () => {
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
              title: 'Docs',
              url: 'https://example.com/docs',
              syncing: false,
            },
            {
              id: '12',
              parentId: '10',
              title: 'Empty',
              syncing: false,
              children: [],
            },
          ],
        },
      ],
      [],
    )

    const markdown = await exportToMarkdown({
      selectedBookmarks: null,
      ...baseOptions,
    })

    expect(markdown).toBe(
      [
        '- Bookmarks bar',
        '  - Dev',
        '    - [Docs](https://example.com/docs)',
        '    - Empty',
        '- Other bookmarks',
        '',
      ].join('\n'),
    )
  })

  it('escapes special characters in titles and URLs', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'A [b] *c* _d_ `e`\nline',
          url: 'https://example.com/a_(b) c',
          syncing: false,
        },
      ],
      [],
    )

    const markdown = await exportToMarkdown({
      selectedBookmarks: null,
      ...baseOptions,
    })

    expect(markdown).toContain(
      '  - [A \\[b\\] \\*c\\* \\_d\\_ \\`e\\` line](<https://example.com/a_(b) c>)',
    )
  })

  it('falls back to the URL when the title is empty', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: '',
          url: 'https://example.com',
          syncing: false,
        },
      ],
      [],
    )

    expect(
      await exportToMarkdown({ selectedBookmarks: null, ...baseOptions }),
    ).toContain('[https://example.com](https://example.com)')
  })

  it('exports only the selection and flattens hidden folders', async () => {
    const selection = [
      {
        id: '10',
        parentId: '1',
        title: 'Picked',
        syncing: false,
        children: [
          {
            id: '11',
            parentId: '10',
            title: 'Inside',
            url: 'https://example.com/in',
            syncing: false,
          },
        ],
      },
    ]

    expect(
      await exportToMarkdown({ selectedBookmarks: selection, ...baseOptions }),
    ).toBe('- Picked\n  - [Inside](https://example.com/in)\n')
    expect(
      await exportToMarkdown({
        selectedBookmarks: selection,
        ...baseOptions,
        hideParentFolder: true,
      }),
    ).toBe('- [Inside](https://example.com/in)\n')
  })

  it('reports progress and honors the abort signal', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'One',
          url: 'https://example.com',
          syncing: false,
        },
      ],
      [],
    )
    const events: { done: number; total: number }[] = []
    await exportToMarkdown({
      selectedBookmarks: null,
      ...baseOptions,
      onProgress: (progress) => {
        events.push(progress)
      },
    })
    expect(events.at(-1)).toEqual({ done: 1, total: 1 })

    const controller = new AbortController()
    controller.abort()
    await expect(
      exportToMarkdown({
        selectedBookmarks: null,
        ...baseOptions,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(ExportCanceledError)
  })
})
