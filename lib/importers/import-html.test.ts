// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from '@/lib/testing/fake-bookmarks'

import { importFromHTML, parseHTML } from './import-html'
import { parseLocationAwareImport } from './parse-import'

const HTML_HEADER = [
  '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  '<TITLE>Bookmarks</TITLE>',
  '<H1>Bookmarks</H1>',
].join('\n')

function buildHtml(): string {
  return `${HTML_HEADER}
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://a.example">Special &amp; "Chars"</A>
    </DL><p>
    <DT><A HREF="https://b.example">B</A>
</DL><p>`
}

beforeEach(() => {
  resetFakeBookmarks()
})

describe('parseHTML', () => {
  it('keeps the children of folders that carry a <DD> description', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><H3>Described</H3>
        <DD>A folder description
        <DL><p>
            <DT><A HREF="https://inner.example">Inner</A>
            <DT><H3>Deep</H3>
            <DD>Deep description
            <DL><p>
                <DT><A HREF="https://deep.example">Deep link</A>
            </DL><p>
        </DL><p>
    </DL><p>
</DL><p>`

    const bar = parseHTML(html).find((n) => n.isBookmarksBar)
    const described = bar?.children?.[0]
    expect(described?.title).toBe('Described')
    expect(described?.children?.map((n) => n.title)).toEqual(['Inner', 'Deep'])
    expect(described?.children?.[1]?.children?.[0]?.url).toBe(
      'https://deep.example',
    )
  })

  it('keeps wrapper siblings when the toolbar folder is nested inside a wrapper folder', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><A HREF="https://top.example">Top level</A>
    <DT><H3>Wrapper</H3>
    <DL><p>
        <DT><A HREF="https://sibling.example">Wrapper sibling</A>
        <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
        <DL><p>
            <DT><A HREF="https://bar.example">Bar link</A>
        </DL><p>
    </DL><p>
</DL><p>`

    const parsed = parseHTML(html)
    const bar = parsed.find((n) => n.isBookmarksBar)
    expect(bar?.children?.map((n) => n.url)).toEqual(['https://bar.example'])

    const other = parsed.find((n) => n.isOtherBookmarks)
    const urls: string[] = []
    const collect = (nodes: typeof parsed): void => {
      for (const node of nodes) {
        if (node.url) urls.push(node.url)
        collect(node.children ?? [])
      }
    }
    collect(other?.children ?? [])
    expect(urls.toSorted((a, b) => a.localeCompare(b))).toEqual([
      'https://sibling.example',
      'https://top.example',
    ])
  })

  it('returns an empty array when there is no <dl>', () => {
    expect(parseHTML('<html><body>nothing here</body></html>')).toEqual([])
  })

  it('parses the bookmarks bar and synthesizes an other-bookmarks folder, unescaping entities', () => {
    const parsed = parseHTML(buildHtml())

    const bar = parsed.find((n) => n.isBookmarksBar)
    expect(bar?.children?.[0]?.title).toBe('Special & "Chars"')
    expect(bar?.children?.[0]?.url).toBe('https://a.example')

    const other = parsed.find((n) => n.isOtherBookmarks)
    expect(other?.children?.[0]?.url).toBe('https://b.example')
  })

  it('leaves url undefined for a malformed or disallowed-scheme href, same as a missing href', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><A HREF="not-a-url">Bare string</A>
    <DT><A HREF="">Empty</A>
    <DT><A HREF="javascript:alert(1)">Disallowed scheme</A>
    <DT><A HREF="https://valid.example">Valid</A>
</DL><p>`

    const parsed = parseHTML(html)
    const other = parsed.find((n) => n.isOtherBookmarks)

    expect(other?.children?.map((n) => n.url)).toEqual([
      undefined,
      undefined,
      undefined,
      'https://valid.example',
    ])
  })

  it('recognizes a top-level H3 with unfiled_bookmarks_folder="true" as Other, merging its children', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3 UNFILED_BOOKMARKS_FOLDER="true">Other Bookmarks</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
</DL><p>`

    const parsed = parseHTML(html)

    expect(parsed.find((n) => n.isBookmarksBar)).toBeUndefined()
    const other = parsed.find((n) => n.isOtherBookmarks)
    expect(other?.children).toHaveLength(1)
    expect(other?.children?.[0]?.url).toBe('https://a.example')
  })

  it('recognizes a top-level "Other bookmarks" H3 by title, case-insensitively', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3>oThEr BoOkMaRkS</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
</DL><p>`

    const parsed = parseHTML(html)

    const other = parsed.find((n) => n.isOtherBookmarks)
    expect(other?.children).toHaveLength(1)
    expect(other?.children?.[0]?.url).toBe('https://a.example')
  })

  it('recognizes a top-level "Mobile bookmarks" H3 by title, merging into a Mobile node', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3>Mobile bookmarks</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
</DL><p>`

    const parsed = parseHTML(html)

    expect(parsed.find((n) => n.isOtherBookmarks)).toBeUndefined()
    const mobile = parsed.find((n) => n.isMobileBookmarks)
    expect(mobile?.children).toHaveLength(1)
    expect(mobile?.children?.[0]?.url).toBe('https://a.example')
  })

  it('recognizes a top-level H3 matching the live Other root title', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3>Otros marcadores</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
</DL><p>`

    const parsed = parseHTML(html, {
      bookmarksBarTitle: 'Bookmarks bar',
      otherBookmarksTitle: 'Otros marcadores',
      mobileTitle: undefined,
    })

    const other = parsed.find((n) => n.isOtherBookmarks)
    expect(other?.children).toHaveLength(1)
    expect(other?.children?.[0]?.url).toBe('https://a.example')
  })

  it('keeps an unmatched top-level H3 as a normal nested folder', () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3>Work</H3>
    <DL><p>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
</DL><p>`

    const parsed = parseHTML(html)

    const other = parsed.find((n) => n.isOtherBookmarks)
    expect(other?.children).toHaveLength(1)
    const folder = other?.children?.[0]
    expect(folder?.title).toBe('Work')
    expect(folder?.isOtherBookmarks).toBeUndefined()
    expect(folder?.isMobileBookmarks).toBeUndefined()
    expect(folder?.children?.[0]?.url).toBe('https://a.example')
  })
})

describe('importFromHTML', () => {
  it('creates an "Imported bookmarks" folder tree in folder mode', async () => {
    await importFromHTML(buildHtml(), 'folder')

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    expect(importedFolder).toBeDefined()

    const importedBar = importedFolder?.children?.find(
      (n) => n.title === 'Bookmarks bar',
    )
    expect(importedBar?.children?.[0]?.url).toBe('https://a.example')
    expect(
      importedFolder?.children?.some((n) => n.url === 'https://b.example'),
    ).toBe(true)
  })

  it('creates bookmarks directly under bar/other in restore-merge mode', async () => {
    await importFromHTML(buildHtml(), 'restore-merge')

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1')
    const other = root.children?.find((n) => n.id === '2')
    expect(bar?.children?.[0]?.url).toBe('https://a.example')
    expect(other?.children?.[0]?.url).toBe('https://b.example')
  })

  it('resolves without creating any bookmarks for HTML with no <dl>', async () => {
    await expect(importFromHTML('<html></html>', 'folder')).resolves.toEqual({
      skippedInvalidUrl: 0,
      skippedDuplicates: 0,
    })

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    expect(importedFolder?.children).toEqual([])
  })

  it('resolves the bookmarks bar and Other bookmarks by folderType, not position', async () => {
    resetFakeBookmarks({ withMobileRoot: true })

    await importFromHTML(buildHtml(), 'restore-merge')

    const root = getFakeBookmarksRoot()
    const bar = root.children?.find((n) => n.id === '1')
    const other = root.children?.find((n) => n.id === '2')
    expect(bar?.children?.[0]?.url).toBe('https://a.example')
    expect(other?.children?.[0]?.url).toBe('https://b.example')
  })
})

describe('importFromHTML fidelity', () => {
  it('creates empty folders and counts bookmarks with an unsupported address', async () => {
    const html = `${HTML_HEADER}
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><H3>Empty</H3>
        <DL><p>
        </DL><p>
        <DT><A HREF="javascript:alert(1)">Bad</A>
        <DT><A HREF="chrome://settings">Settings</A>
        <DT><A HREF="https://a.example">A</A>
    </DL><p>
</DL><p>`

    const result = await importFromHTML(html, 'restore-merge')

    expect(result).toEqual({ skippedInvalidUrl: 2, skippedDuplicates: 0 })
    const bar = getFakeBookmarksRoot().children?.find((n) => n.id === '1')
    expect(bar?.children?.map((n) => n.title)).toEqual(['Empty', 'A'])
    expect(bar?.children?.[0]?.children).toEqual([])
  })
})

describe('HTML location data and folder mode', () => {
  const flatHtml = `${HTML_HEADER}
<DL><p>
    <DT><A HREF="https://a.example">A</A>
    <DT><H3>Reading</H3>
    <DL><p><DT><A HREF="https://b.example">B</A></DL><p>
</DL><p>`

  it('reports no location data for a flat export', () => {
    expect(parseLocationAwareImport(flatHtml, 'html')?.hasLocationData).toBe(
      false,
    )
  })

  it('reports location data for toolbar, Other and Mobile markers', () => {
    const other = `${HTML_HEADER}
<DL><p><DT><H3>Other bookmarks</H3><DL><p><DT><A HREF="https://a.example">A</A></DL><p></DL><p>`
    const mobile = `${HTML_HEADER}
<DL><p><DT><H3>Mobile bookmarks</H3><DL><p><DT><A HREF="https://a.example">A</A></DL><p></DL><p>`
    const unfiled = `${HTML_HEADER}
<DL><p><DT><H3 UNFILED_BOOKMARKS_FOLDER="true">Misc</H3><DL><p><DT><A HREF="https://a.example">A</A></DL><p></DL><p>`
    for (const html of [buildHtml(), other, mobile, unfiled]) {
      expect(parseLocationAwareImport(html, 'html')?.hasLocationData).toBe(true)
    }
  })

  it('creates no empty "Bookmarks bar" subfolder in folder mode', async () => {
    await importFromHTML(flatHtml, 'folder')

    const root = getFakeBookmarksRoot()
    const other = root.children?.find((n) => n.id === '2')
    const imported = other?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    expect(imported).toBeDefined()
    expect(imported?.children?.some((n) => n.title === 'Bookmarks bar')).toBe(
      false,
    )
  })
})
