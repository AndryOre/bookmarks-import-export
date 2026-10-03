import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  planPopupImport,
  POPUP_IMPORT_BOOKMARK_LIMIT,
} from './popup-import-plan'
import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from './testing/fake-bookmarks'

function csvWithBookmarks(count: number): string {
  const rows = Array.from(
    { length: count },
    (_, index) => `Bookmark ${index},https://new-${index}.example/page`,
  )
  return ['title,url', ...rows].join('\n')
}

const EXISTING_ROW = 'Dup,https://existing.example/page'

const BAR_JSON = JSON.stringify({
  id: '1',
  title: 'Bookmarks bar',
  dateAdded: 0,
  children: [{ title: 'A', url: 'https://a.example/page', dateAdded: 0 }],
})

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  seedFakeBookmarksTree([
    {
      id: 'seed',
      title: 'Existing',
      url: 'https://existing.example/page',
      syncing: false,
    },
  ])
})

describe('planPopupImport', () => {
  it('imports a small file in the popup', async () => {
    const plan = await planPopupImport({
      text: csvWithBookmarks(3),
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: true,
    })
    expect(plan).toEqual({ kind: 'import', mode: 'folder' })
  })

  it('routes a file above the limit to the App page', async () => {
    const plan = await planPopupImport({
      text: csvWithBookmarks(POPUP_IMPORT_BOOKMARK_LIMIT + 1),
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: false,
    })
    expect(plan).toEqual({ kind: 'app' })
  })

  it('keeps a file exactly at the limit in the popup', async () => {
    const plan = await planPopupImport({
      text: csvWithBookmarks(POPUP_IMPORT_BOOKMARK_LIMIT),
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: false,
    })
    expect(plan.kind).toBe('import')
  })

  it('counts only the bookmarks left after Skip duplicates against the limit', async () => {
    const text = `${csvWithBookmarks(POPUP_IMPORT_BOOKMARK_LIMIT)}\n${EXISTING_ROW}`
    const plan = await planPopupImport({
      text,
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: true,
    })
    expect(plan.kind).toBe('import')
  })

  it('reports all-duplicates instead of creating empty folders', async () => {
    const plan = await planPopupImport({
      text: `title,url\n${EXISTING_ROW}`,
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: true,
    })
    expect(plan).toEqual({ kind: 'all-duplicates', skippedDuplicates: 1 })
  })

  it('imports an all-duplicates file when Skip duplicates is off', async () => {
    const plan = await planPopupImport({
      text: `title,url\n${EXISTING_ROW}`,
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: false,
    })
    expect(plan.kind).toBe('import')
  })

  it('always routes restore-replace to the App page', async () => {
    const plan = await planPopupImport({
      text: BAR_JSON,
      mimeType: 'application/json',
      fileName: 'a.json',
      mode: 'restore-replace',
      skipDuplicates: true,
    })
    expect(plan).toEqual({ kind: 'app' })
  })

  it('falls back to folder mode for a file without location data', async () => {
    const plan = await planPopupImport({
      text: csvWithBookmarks(1),
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'restore-replace',
      skipDuplicates: true,
    })
    expect(plan).toEqual({ kind: 'import', mode: 'folder' })
  })

  it('rejects an unsupported format', async () => {
    await expect(
      planPopupImport({
        text: 'plain notes',
        mimeType: 'text/plain',
        fileName: 'a.txt',
        mode: 'folder',
        skipDuplicates: true,
      }),
    ).rejects.toThrow('Unsupported file format')
  })

  it('rejects a file with no bookmarks', async () => {
    await expect(
      planPopupImport({
        text: '[]',
        mimeType: 'application/json',
        fileName: 'a.json',
        mode: 'folder',
        skipDuplicates: true,
      }),
    ).rejects.toThrow('No bookmarks found')
  })
})
