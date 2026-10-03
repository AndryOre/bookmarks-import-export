// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { resetFakeI18n } from '@/lib/testing/fake-i18n'

import { getImportPreview } from './import-preview'

beforeEach(() => {
  resetFakeI18n()
})

const HTML_HEADER = [
  '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  '<TITLE>Bookmarks</TITLE>',
  '<H1>Bookmarks</H1>',
].join('\n')

describe('getImportPreview', () => {
  it('previews an HTML export with bookmarks bar and other bookmarks', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
    <DT><A HREF="https://b.example">B</A>
</DL><p>`

    const preview = getImportPreview(html, 'text/html')

    expect(preview.format).toBe('html')
    expect(preview.bookmarksBarCount).toBe(1)
    expect(preview.otherBookmarksCount).toBe(1)
    expect(preview.totalCount).toBe(2)
    expect(preview.hasLocationData).toBe(true)
    expect(preview.mobileBookmarksCount).toBe(0)
  })

  it('previews an HTML export with a Mobile bookmarks root', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
    <DT><H3>Mobile bookmarks</H3>
    <DL><p>
        <DT><A HREF="https://c.example">C</A>
    </DL><p>
</DL><p>`

    const preview = getImportPreview(html, 'text/html')

    expect(preview.mobileBookmarksCount).toBe(1)
    expect(preview.totalCount).toBe(2)
  })

  it('flags a Mobile root holding only folders as clearing Mobile', () => {
    const json = JSON.stringify([
      {
        id: '3',
        title: 'Mobile bookmarks',
        dateAdded: 0,
        children: [{ title: 'Empty folder', dateAdded: 0, children: [] }],
      },
    ])

    const preview = getImportPreview(json, 'application/json')

    expect(preview.mobileBookmarksCount).toBe(0)
    expect(preview.clearsMobileRoot).toBe(true)
  })

  it('counts every Mobile root when account-storage roots share a folderType', () => {
    const json = JSON.stringify([
      {
        id: '0',
        title: '',
        dateAdded: 0,
        children: [
          { id: '3', title: 'Mobile bookmarks', dateAdded: 0, children: [] },
          {
            id: 'account-mobile',
            title: 'Mobile bookmarks',
            folderType: 'mobile',
            dateAdded: 0,
            children: [
              { title: 'Phone', url: 'https://phone.example', dateAdded: 0 },
            ],
          },
        ],
      },
    ])

    const preview = getImportPreview(json, 'application/json')

    expect(preview.mobileBookmarksCount).toBe(1)
    expect(preview.clearsMobileRoot).toBe(true)
  })

  it('previews a JSON export produced by exportToJSON', () => {
    const json = JSON.stringify({
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          children: [{ title: 'A', url: 'https://a.example' }],
        },
        {
          id: '2',
          title: 'Other bookmarks',
          isOtherBookmarks: true,
          children: [{ title: 'B', url: 'https://b.example' }],
        },
      ],
    })

    const preview = getImportPreview(json, 'application/json')

    expect(preview.format).toBe('json')
    expect(preview.bookmarksBarCount).toBe(1)
    expect(preview.otherBookmarksCount).toBe(1)
    expect(preview.totalCount).toBe(2)
    expect(preview.hasLocationData).toBe(true)
    expect(preview.mobileBookmarksCount).toBe(0)
  })

  it('previews a JSON export with a Mobile bookmarks root', () => {
    const json = JSON.stringify({
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          children: [{ title: 'A', url: 'https://a.example' }],
        },
        {
          id: '2',
          title: 'Other bookmarks',
          isOtherBookmarks: true,
          children: [{ title: 'B', url: 'https://b.example' }],
        },
        {
          id: '3',
          title: 'Mobile bookmarks',
          isMobileBookmarks: true,
          children: [{ title: 'C', url: 'https://c.example' }],
        },
      ],
    })

    const preview = getImportPreview(json, 'application/json')

    expect(preview.mobileBookmarksCount).toBe(1)
    expect(preview.totalCount).toBe(3)
  })

  it('previews a CSV export, counting only rows with a valid URL', () => {
    const csv = [
      'title,url,folder',
      'A,https://a.example,',
      'Invalid,not-a-url,',
      ',https://missing-title.example,',
    ].join('\n')

    const preview = getImportPreview(csv, 'text/csv')

    expect(preview.format).toBe('csv')
    expect(preview.totalCount).toBe(2)
    expect(preview.hasLocationData).toBe(false)
  })

  it('does not count CSV rows with a disallowed scheme or a malformed row', () => {
    const csv = [
      'title,url,folder',
      'A,https://a.example,',
      'Bad,javascript:alert(1),',
      'Broken,https://broken.example,Dev,extra',
    ].join('\n')

    expect(getImportPreview(csv, 'text/csv').totalCount).toBe(1)
  })

  it('does not count JSON bookmarks with a disallowed scheme', () => {
    const json = JSON.stringify({
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          children: [
            { title: 'A', url: 'https://a.example' },
            { title: 'Bad', url: 'javascript:alert(1)' },
          ],
        },
      ],
    })

    const preview = getImportPreview(json, 'application/json')

    expect(preview.totalCount).toBe(1)
    expect(preview.bookmarksBarCount).toBe(1)
  })

  it('returns a zeroed preview for an empty tree', () => {
    const preview = getImportPreview('{}', 'application/json')

    expect(preview.totalCount).toBe(0)
    expect(preview.bookmarksBarCount).toBe(0)
    expect(preview.otherBookmarksCount).toBe(0)
    expect(preview.mobileBookmarksCount).toBe(0)
  })

  it('returns a zeroed preview for unrecognized content', () => {
    const preview = getImportPreview(
      'not json, not html, not csv',
      'text/plain',
    )

    expect(preview.format).toBe('unknown')
    expect(preview.totalCount).toBe(0)
    expect(preview.hasLocationData).toBe(false)
  })
})
