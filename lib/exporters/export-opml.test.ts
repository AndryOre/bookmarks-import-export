// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { exportToOPML } from './export-opml'

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

function parse(xml: string): Document {
  const document_ = new DOMParser().parseFromString(xml, 'application/xml')
  expect(document_.querySelector('parsererror')).toBeNull()
  return document_
}

describe('exportToOPML', () => {
  it('produces a valid OPML 2.0 skeleton for an empty tree', async () => {
    const document_ = parse(
      await exportToOPML({ selectedBookmarks: null, ...baseOptions }),
    )

    expect(document_.documentElement.nodeName).toBe('opml')
    expect(document_.documentElement.getAttribute('version')).toBe('2.0')
    expect(
      document_.documentElement.querySelector(':scope > head > title')
        ?.textContent,
    ).toBe('Bookmarks')
    expect(document_.querySelector('body')).not.toBeNull()
  })

  it('nests folders and writes link outlines with escaped values', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Tools & "Stuff"',
          syncing: false,
          children: [
            {
              id: '11',
              parentId: '10',
              title: "<b>Bold</b> it's",
              url: 'https://example.com/?a=1&b=2',
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

    const document_ = parse(
      await exportToOPML({ selectedBookmarks: null, ...baseOptions }),
    )

    const folder = document_.querySelector(
      String.raw`body > outline > outline[text="Tools & \"Stuff\""]`,
    )
    expect(folder).not.toBeNull()
    const link = folder?.querySelector('outline[type="link"]')
    expect(link?.getAttribute('text')).toBe("<b>Bold</b> it's")
    expect(link?.getAttribute('url')).toBe('https://example.com/?a=1&b=2')
    const empty = folder?.querySelector('outline[text="Empty"]')
    expect(empty?.hasAttribute('type')).toBe(false)
    expect(empty?.children).toHaveLength(0)
  })

  it('exports only the selection', async () => {
    const document_ = parse(
      await exportToOPML({
        selectedBookmarks: [
          {
            id: '11',
            parentId: '10',
            title: 'Only',
            url: 'https://example.com',
            syncing: false,
          },
        ],
        ...baseOptions,
      }),
    )

    const outlines = document_.querySelectorAll('outline')
    expect(outlines).toHaveLength(1)
    expect(outlines[0]?.getAttribute('type')).toBe('link')
  })

  it('strips characters XML cannot carry', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'a\u{1}b',
          url: 'https://example.com',
          syncing: false,
        },
      ],
      [],
    )

    const document_ = parse(
      await exportToOPML({ selectedBookmarks: null, ...baseOptions }),
    )

    expect(
      document_.querySelector('outline[type="link"]')?.getAttribute('text'),
    ).toBe('ab')
  })
})
