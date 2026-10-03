// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

import { detectFormat } from '@/lib/detect-format'
import { getImportPreview } from '@/lib/import-preview'
import { runImport } from '@/lib/run-import'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from '@/lib/testing/fake-bookmarks'

import { parseChromeBookmarks } from './import-chrome'
import { parseSafari } from './import-safari'
import { parseXBEL } from './import-xbel'

function fixture(name: string): string {
  return readFileSync(path.resolve('e2e/fixtures', name), 'utf8')
}

const chromeFile = fixture('chrome-profile-bookmarks.json')
const xbelFile = fixture('bookmarks.xbel')
const safariFile = fixture('bookmarks-safari.html')

function urlsUnder(rootId: string): string[] {
  const urls: string[] = []
  const visit = (node: { url?: string; children?: unknown[] }): void => {
    if (node.url) urls.push(node.url)
    const children = (node.children ?? []) as (typeof node)[]
    for (const child of children) visit(child)
  }
  const root = getFakeBookmarksRoot().children?.find((n) => n.id === rootId)
  if (root) visit(root)
  return urls
}

beforeEach(() => {
  resetFakeBookmarks()
})

describe('detectFormat for the new sources', () => {
  it('detects a Chrome profile Bookmarks file by content, with or without an extension', () => {
    expect(detectFormat(chromeFile, 'application/json')).toBe('chrome')
    expect(detectFormat(chromeFile, '', 'Bookmarks')).toBe('chrome')
  })

  it('keeps plain JSON exports as json', () => {
    expect(detectFormat('[{"title":"a"}]', 'application/json')).toBe('json')
  })

  it('detects XBEL by MIME, extension and content', () => {
    expect(detectFormat(xbelFile, 'application/xml')).toBe('xbel')
    expect(detectFormat(xbelFile, '', 'export.xbel')).toBe('xbel')
    expect(detectFormat(xbelFile, '', 'export')).toBe('xbel')
  })

  it('rejects XML that is not XBEL', () => {
    expect(detectFormat('<opml version="2.0"></opml>', 'text/xml')).toBe(
      'unknown',
    )
  })

  it('detects Safari exports and keeps other Netscape HTML as html', () => {
    expect(detectFormat(safariFile, 'text/html')).toBe('safari')
    expect(detectFormat(fixture('bookmarks.html'), 'text/html')).toBe('html')
  })
})

describe('parsers', () => {
  it('maps Chrome roots to bar, other and mobile and converts dates', () => {
    const tree = parseChromeBookmarks(chromeFile)

    expect(tree.map((n) => n.title)).toEqual([
      'Bookmarks bar',
      'Other bookmarks',
      'Mobile bookmarks',
    ])
    expect(tree[0]?.isBookmarksBar).toBe(true)
    expect(tree[1]?.isOtherBookmarks).toBe(true)
    expect(tree[2]?.isMobileBookmarks).toBe(true)
    expect(tree[0]?.children?.[0]?.dateAdded).toBe(
      13_300_000_000_000 - 11_644_473_600_000,
    )
  })

  it('leaves a disallowed Chrome URL undefined', () => {
    const blocked = parseChromeBookmarks(chromeFile)[0]?.children?.[2]
    expect(blocked?.url).toBeUndefined()
  })

  it('maps XBEL root folders and flags location data', () => {
    const { tree, hasLocationData } = parseXBEL(xbelFile)

    expect(hasLocationData).toBe(true)
    expect(tree[0]?.isBookmarksBar).toBe(true)
    expect(tree[0]?.children?.map((n) => n.title)).toEqual([
      'XBEL Bar A',
      'XBEL Folder',
    ])
    expect(tree[1]?.isOtherBookmarks).toBe(true)
  })

  it('puts an XBEL without root folders into Other with no location data', () => {
    const { tree, hasLocationData } = parseXBEL(
      '<xbel><folder><title>Loose</title><bookmark href="https://a.example"><title>A</title></bookmark></folder></xbel>',
    )

    expect(hasLocationData).toBe(false)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.isOtherBookmarks).toBe(true)
    expect(tree[0]?.children?.[0]?.title).toBe('Loose')
  })

  it('rejects malformed XBEL', () => {
    expect(() => parseXBEL('<xbel><folder></xbel>')).toThrow()
  })

  it('maps Safari Favorites to the bar and Reading List to its own folder', () => {
    const tree = parseSafari(safariFile)

    expect(tree[0]?.isBookmarksBar).toBe(true)
    expect(tree[0]?.children?.map((n) => n.title)).toEqual([
      'Safari Fav A',
      'Safari Fav B',
      'Safari Blocked',
    ])
    expect(tree[1]?.isOtherBookmarks).toBe(true)
    expect(tree[1]?.children?.[0]?.title).toBe('Reading List')
  })
})

describe('getImportPreview', () => {
  it('counts per root for a Chrome Bookmarks file', () => {
    expect(getImportPreview(chromeFile, 'application/json')).toMatchObject({
      format: 'chrome',
      bookmarksBarCount: 2,
      otherBookmarksCount: 1,
      mobileBookmarksCount: 1,
      clearsMobileRoot: true,
      totalCount: 4,
      hasLocationData: true,
    })
  })

  it('recognizes XBEL root folders titled like the live browser roots', () => {
    const edgeXbel = `<?xml version="1.0" encoding="UTF-8"?>
<xbel version="1.0">
  <folder><title>Favorites bar</title><bookmark href="https://a.example"><title>A</title></bookmark></folder>
  <folder><title>Other favorites</title><bookmark href="https://b.example"><title>B</title></bookmark></folder>
</xbel>`
    const liveRootTitles = {
      bookmarksBarTitle: 'Favorites bar',
      otherBookmarksTitle: 'Other favorites',
      mobileTitle: undefined,
    }

    expect(getImportPreview(edgeXbel, '', 'a.xbel')).toMatchObject({
      hasLocationData: false,
    })
    expect(
      getImportPreview(edgeXbel, '', 'a.xbel', liveRootTitles),
    ).toMatchObject({
      hasLocationData: true,
      bookmarksBarCount: 1,
      otherBookmarksCount: 1,
    })
  })

  it('counts per root for XBEL and Safari', () => {
    expect(getImportPreview(xbelFile, '', 'a.xbel')).toMatchObject({
      format: 'xbel',
      bookmarksBarCount: 2,
      otherBookmarksCount: 1,
      totalCount: 3,
      hasLocationData: true,
    })
    expect(getImportPreview(safariFile, 'text/html')).toMatchObject({
      format: 'safari',
      bookmarksBarCount: 2,
      otherBookmarksCount: 1,
      totalCount: 3,
      hasLocationData: true,
    })
  })

  it('reports no location data for an XBEL without root folders', () => {
    const preview = getImportPreview(
      '<xbel><bookmark href="https://a.example"><title>A</title></bookmark></xbel>',
      '',
      'a.xbel',
    )
    expect(preview.hasLocationData).toBe(false)
    expect(preview.totalCount).toBe(1)
  })
})

describe('runImport for the new sources', () => {
  it('imports a Chrome Bookmarks file into bar, other and mobile (restore-merge)', async () => {
    resetFakeBookmarks({ withMobileRoot: true })
    const result = await runImport(
      chromeFile,
      'application/json',
      'restore-merge',
    )

    expect(result.skippedInvalidUrl).toBe(1)
    expect(urlsUnder('1')).toEqual([
      'https://chrome-bar-a.example/page',
      'https://chrome-nested-a.example/page',
    ])
    expect(urlsUnder('2')).toContain('https://chrome-other-a.example/page')
    expect(urlsUnder('3')).toEqual(['https://chrome-mobile-a.example/page'])
  })

  it('imports XBEL into the roots and counts the disallowed scheme as skipped', async () => {
    const result = await runImport(xbelFile, '', 'restore-merge', 'a.xbel')

    expect(result.skippedInvalidUrl).toBe(1)
    expect(urlsUnder('1')).toEqual([
      'https://xbel-bar-a.example/page',
      'https://xbel-nested-a.example/page',
    ])
    expect(urlsUnder('2')).toEqual(['https://xbel-other-a.example/page'])
  })

  it('imports XBEL without root folders into a folder even in a restore mode', async () => {
    await runImport(
      '<xbel><bookmark href="https://loose.example"><title>L</title></bookmark></xbel>',
      '',
      'restore-replace',
      'a.xbel',
    )

    const other = getFakeBookmarksRoot().children?.find((n) => n.id === '2')
    expect(other?.children?.[0]?.title).toBe('Imported bookmarks')
    expect(urlsUnder('2')).toEqual(['https://loose.example'])
  })

  it('imports Safari Favorites into the bar and Reading List as its own folder', async () => {
    const result = await runImport(safariFile, 'text/html', 'restore-merge')

    expect(result.skippedInvalidUrl).toBe(1)
    expect(urlsUnder('1')).toEqual([
      'https://safari-fav-a.example/page',
      'https://safari-fav-b.example/page',
    ])
    const other = getFakeBookmarksRoot().children?.find((n) => n.id === '2')
    const readingList = other?.children?.find((n) => n.title === 'Reading List')
    expect(readingList?.children?.map((n) => n.url)).toEqual([
      'https://safari-reading-a.example/page',
    ])
  })
})

describe('XBEL detection prolog', () => {
  it('accepts comments and a doctype before the xbel element', () => {
    const file =
      '<?xml version="1.0"?><!-- a --><!DOCTYPE xbel><!-- b --><xbel version="1.0"></xbel>'
    expect(detectFormat(file, '', 'a.txt')).toBe('xbel')
  })

  it('rejects an unterminated comment without hanging', () => {
    const file = `<!--${'--><!--'.repeat(50_000)}`
    expect(detectFormat(file, '', 'a.txt')).not.toBe('xbel')
  })
})
