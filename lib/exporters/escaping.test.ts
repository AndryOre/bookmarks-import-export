// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { importFromHTML } from '@/lib/importers/import-html'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { exportToHTML } from './export-html'
import { exportToMarkdown } from './export-markdown'
import { exportToOPML } from './export-opml'

const flags = {
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

describe('HTML URL escaping', () => {
  it('round-trips ampersand sequences that look like character references', async () => {
    const urls = ['https://x/?a=1&copy', 'https://x/?a=1&amp;b=2']
    seedFakeBookmarksTree(
      urls.map((url, index) => ({
        id: String(10 + index),
        parentId: '1',
        title: `T${index}`,
        url,
        syncing: false,
      })),
    )

    const html = await exportToHTML({ selectedBookmarks: null, ...flags })
    resetFakeBookmarks()
    await importFromHTML(html, 'restore-merge')

    const bar = getFakeBookmarksRoot().children?.find((n) => n.id === '1')
    expect(bar?.children?.map((n) => n.url)).toEqual(urls)
  })
})

describe('OPML attribute whitespace', () => {
  it('preserves newline and tab in titles through an XML parse', async () => {
    seedFakeBookmarksTree([
      {
        id: '10',
        parentId: '1',
        title: 'a\nb\tc',
        url: 'https://example.com',
        syncing: false,
      },
    ])

    const xml = await exportToOPML({ selectedBookmarks: null, ...flags })
    const document_ = new DOMParser().parseFromString(xml, 'application/xml')

    const link = document_.querySelector('outline[type="link"]')
    expect(link?.getAttribute('text')).toBe('a\nb\tc')
    expect(link?.getAttribute('title')).toBe('a\nb\tc')
  })
})

describe('Markdown list-marker titles', () => {
  it('escapes titles that would render as nested list items', async () => {
    seedFakeBookmarksTree([
      {
        id: '10',
        parentId: '1',
        title: '- dash',
        syncing: false,
        children: [],
      },
      {
        id: '11',
        parentId: '1',
        title: '+ plus',
        syncing: false,
        children: [],
      },
      {
        id: '12',
        parentId: '1',
        title: '1. one',
        syncing: false,
        children: [],
      },
    ])

    const markdown = await exportToMarkdown({
      selectedBookmarks: null,
      ...flags,
    })

    expect(markdown).toContain(String.raw`  - \- dash`)
    expect(markdown).toContain(String.raw`  - \+ plus`)
    expect(markdown).toContain(String.raw`  - 1\. one`)
  })
})
