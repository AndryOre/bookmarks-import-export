import { beforeEach, describe, expect, it } from 'vitest'

import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from '@/lib/testing/fake-bookmarks'

import { importFromCSV } from './import-csv'

beforeEach(() => {
  resetFakeBookmarks()
})

describe('importFromCSV', () => {
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

  it('skips rows with a missing title, url, or an invalid url', async () => {
    const csv = [
      'title,url,folder',
      ',https://missing-title.example,',
      'Missing URL,,',
      'Invalid,not-a-url,',
      'Valid,https://valid.example,',
    ].join('\n')

    await importFromCSV(csv)

    const root = getFakeBookmarksRoot()
    const otherBookmarks = root.children?.find((n) => n.id === '2')
    const imported = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )

    expect(imported?.children).toHaveLength(1)
    expect(imported?.children?.[0]?.url).toBe('https://valid.example')
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

  it('throws when the CSV cannot be parsed', async () => {
    // An unterminated quoted field is a genuine Papaparse parse error.
    await expect(
      importFromCSV('title,url,folder\n"A,https://a.example,'),
    ).rejects.toThrow()
  })
})
