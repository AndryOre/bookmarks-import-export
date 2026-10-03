import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from '@/lib/testing/fake-bookmarks'

import { importFromCSV } from './import-csv'

beforeEach(() => {
  resetFakeBookmarks()
})

describe('importFromCSV', () => {
  it('returns how many rows were skipped for an unsupported address', async () => {
    const csv = [
      'title,url,folder',
      'Bad,javascript:alert(1),',
      'Local,file:///etc/passwd,',
      'Good,https://good.example,',
    ].join('\n')

    await expect(importFromCSV(csv)).resolves.toEqual({
      skippedInvalidUrl: 2,
      skippedDuplicates: 0,
    })
    await expect(
      importFromCSV('title,url,folder\nGood,https://good.example,'),
    ).resolves.toEqual({ skippedInvalidUrl: 0, skippedDuplicates: 0 })
  })

  it('creates a nested folder structure from the folder path column', async () => {
    const csv = [
      'title,url,folder',
      'A,https://a.example,Dev/Frontend',
      'B,https://b.example,Dev/Frontend',
      'C,https://c.example,Dev',
    ].join('\n')

    await importFromCSV(csv)

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const imported = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const development = imported?.children?.find((n) => n.title === 'Dev')
    const frontend = development?.children?.find((n) => n.title === 'Frontend')

    expect(frontend?.children?.map((n) => n.url)).toEqual([
      'https://a.example',
      'https://b.example',
    ])
    expect(
      development?.children?.some((n) => n.url === 'https://c.example'),
    ).toBe(true)
  })

  it('skips rows with a missing url or a disallowed url, but keeps empty titles', async () => {
    const csv = [
      'title,url,folder',
      ',https://missing-title.example,',
      'Missing URL,,',
      'Invalid,not-a-url,',
      'Disallowed scheme,javascript:alert(1),',
      'Valid,https://valid.example,',
    ].join('\n')

    await importFromCSV(csv)

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const imported = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )

    expect(imported?.children?.map((n) => n.url)).toEqual([
      'https://missing-title.example',
      'https://valid.example',
    ])
  })

  it('imports a bookmark row with an empty title', async () => {
    await importFromCSV('title,url,folder\n,https://icon.example,')

    const imported = getFakeBookmarksRoot()
      .children?.find((n) => n.id === '2')
      ?.children?.find((n) => n.title === 'Imported bookmarks')
    expect(imported?.children?.[0]).toMatchObject({
      title: '',
      url: 'https://icon.example',
    })
  })

  it('ignores a bookmark titled "Imported bookmarks" when reusing the folder', async () => {
    await browser.bookmarks.create({
      parentId: '2',
      title: 'Imported bookmarks',
      url: 'https://decoy.example',
    })

    await importFromCSV('title,url,folder\nA,https://a.example,')

    const folder = getFakeBookmarksRoot()
      .children?.find((n) => n.id === '2')
      ?.children?.find((n) => n.title === 'Imported bookmarks' && !n.url)
    expect(folder?.children?.map((n) => n.url)).toEqual(['https://a.example'])
  })

  it('skips a malformed row and counts it instead of failing the import', async () => {
    const csv = [
      'title,url,folder',
      'A,https://a.example,',
      'Broken,https://broken.example,Dev,extra',
      'B,https://b.example,',
    ].join('\n')

    await expect(importFromCSV(csv)).resolves.toEqual({
      skippedInvalidUrl: 1,
      skippedDuplicates: 0,
    })

    const imported = getFakeBookmarksRoot()
      .children?.find((n) => n.id === '2')
      ?.children?.find((n) => n.title === 'Imported bookmarks')
    expect(imported?.children?.map((n) => n.url)).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('reuses the existing "Imported bookmarks" folder across calls (deduplication)', async () => {
    await importFromCSV('title,url,folder\nA,https://a.example,')
    await importFromCSV('title,url,folder\nB,https://b.example,')

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const importedFolders = otherBookmarks?.children?.filter(
      (n) => n.title === 'Imported bookmarks',
    )

    expect(importedFolders).toHaveLength(1)
    expect(importedFolders?.[0]?.children?.map((n) => n.url)).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('reuses an existing folder with the same title + parent (folder dedup)', async () => {
    await importFromCSV('title,url,folder\nA,https://a.example,Dev')
    await importFromCSV('title,url,folder\nB,https://b.example,Dev')

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const imported = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const developmentFolders = imported?.children?.filter(
      (n) => n.title === 'Dev',
    )

    expect(developmentFolders).toHaveLength(1)
    expect(developmentFolders?.[0]?.children?.map((n) => n.url)).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('looks folders up without one bookmarks.search call per folder', async () => {
    await importFromCSV('title,url,folder\nA,https://a.example,Dev')
    const search = vi.spyOn(browser.bookmarks, 'search')
    const getTree = vi.spyOn(browser.bookmarks, 'getTree')
    const rows = Array.from(
      { length: 30 },
      (_, index) => `B${index},https://b${index}.example,Dev/Folder${index}`,
    )

    await importFromCSV(['title,url,folder', ...rows].join('\n'))

    expect(search.mock.calls.length + getTree.mock.calls.length).toBeLessThan(4)
    const root = getFakeBookmarksRoot()
    const imported = root.children
      ?.find((n) => n.id === '2')
      ?.children?.find((n) => n.title === 'Imported bookmarks')
    expect(imported?.children?.filter((n) => n.title === 'Dev')).toHaveLength(1)
    search.mockRestore()
    getTree.mockRestore()
  })

  it('throws when the CSV cannot be parsed', async () => {
    await expect(
      importFromCSV('title,url,folder\n"A,https://a.example,'),
    ).rejects.toThrow()
  })
})
