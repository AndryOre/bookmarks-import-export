import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { exportToHTML } from './export-html'

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

describe('exportToHTML', () => {
  it('produces the Netscape bookmark file skeleton for an empty tree', async () => {
    const html = await exportToHTML({ selectedBookmarks: null, ...baseOptions })

    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(html).toContain('<TITLE>Bookmarks</TITLE>')
    expect(html).toContain('<H1>Bookmarks</H1>')
    expect(html.trimEnd().endsWith('</DL><p>')).toBe(true)
  })

  it('renders nested folders and escapes special characters', async () => {
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
              title: "<script>alert('x')</script>",
              url: 'https://example.com/?a=1&b=2',
              syncing: false,
            },
          ],
        },
      ],
      [],
    )

    const html = await exportToHTML({ selectedBookmarks: null, ...baseOptions })

    expect(html).toContain(
      '<H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>',
    )
    expect(html).toContain('<H3>Tools &amp; &quot;Stuff&quot;</H3>')
    expect(html).toContain(
      '<A HREF="https://example.com/?a=1&amp;b=2">&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</A>',
    )
  })

  it('flattens "Other bookmarks" when hideOtherBookmarks is set', async () => {
    seedFakeBookmarksTree(
      [],
      [
        {
          id: '20',
          parentId: '2',
          title: 'Loose',
          url: 'https://example.org',
          syncing: false,
        },
      ],
    )

    const html = await exportToHTML({
      selectedBookmarks: null,
      ...baseOptions,
      hideOtherBookmarks: true,
    })

    expect(html).not.toContain('Other bookmarks')
    expect(html).toContain('HREF="https://example.org"')
  })

  it('includes ADD_DATE when includeDateAdded is set', async () => {
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

    const html = await exportToHTML({
      selectedBookmarks: null,
      ...baseOptions,
      includeDateAdded: true,
    })

    expect(html).toContain('ADD_DATE="1700000000"')
  })
})
