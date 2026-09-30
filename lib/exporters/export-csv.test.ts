import Papa from 'papaparse'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { exportToCSV } from './export-csv'

const baseOptions = {
  includeIconData: false,
  includeDateAdded: false,
  includeDateLastUsed: false,
  hideParentFolder: false,
}

beforeEach(() => {
  resetFakeBookmarks()
})

function parseRows(csv: string): Record<string, string>[] {
  return Papa.parse<Record<string, string>>(csv, { header: true }).data
}

describe('exportToCSV', () => {
  it('produces an empty string for an empty tree (no rows to unparse)', async () => {
    const csv = await exportToCSV({ selectedBookmarks: null, ...baseOptions })

    expect(csv).toBe('')
  })

  it('flattens nested folders into a folder path column and escapes special characters', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Dev, "Tools"',
          syncing: false,
          children: [
            {
              id: '11',
              parentId: '10',
              title: 'Comma, and "quotes"',
              url: 'https://example.com/a,b',
              syncing: false,
            },
          ],
        },
      ],
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

    const csv = await exportToCSV({ selectedBookmarks: null, ...baseOptions })
    const rows = parseRows(csv)

    const nested = rows.find((r) => r.title === 'Comma, and "quotes"')
    expect(nested?.url).toBe('https://example.com/a,b')
    expect(nested?.folder).toBe('Bookmarks bar/Dev, "Tools"')

    const loose = rows.find((r) => r.title === 'Loose')
    expect(loose?.folder).toBe('Other bookmarks')
  })

  it('flattens the folder path when hideParentFolder is set', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Nested',
          syncing: false,
          children: [
            {
              id: '11',
              parentId: '10',
              title: 'Item',
              url: 'https://example.com',
              syncing: false,
            },
          ],
        },
      ],
      [],
    )

    const csv = await exportToCSV({
      selectedBookmarks: null,
      ...baseOptions,
      hideParentFolder: true,
    })
    const rows = parseRows(csv)

    expect(rows[0]?.folder).toBe('Bookmarks bar')
  })

  it('includes dateAdded column only when includeDateAdded is set', async () => {
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

    const csv = await exportToCSV({
      selectedBookmarks: null,
      ...baseOptions,
      includeDateAdded: true,
    })
    const rows = parseRows(csv)

    expect(csv).toContain('"dateAdded"')
    expect(rows[0]?.dateAdded).toBe('1700000000')
  })
})
