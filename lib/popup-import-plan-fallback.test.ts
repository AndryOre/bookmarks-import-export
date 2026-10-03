import { describe, expect, it, vi } from 'vitest'

import {
  planPopupImport,
  POPUP_IMPORT_BOOKMARK_LIMIT,
} from './popup-import-plan'

vi.mock('./import-duplicates', () => ({
  summarizeImportDuplicates: () =>
    Promise.resolve({ importableCount: 0, skippedDuplicates: 0 }),
}))

vi.mock('./importers/resolve-roots', () => ({
  loadLiveRootTitles: () => Promise.resolve(undefined),
}))

describe('planPopupImport when the duplicate summary is empty', () => {
  it('still applies the size limit to the full bookmark count', async () => {
    const rows = Array.from(
      { length: POPUP_IMPORT_BOOKMARK_LIMIT + 1 },
      (_, index) => `Bookmark ${index},https://new-${index}.example/page`,
    )
    const plan = await planPopupImport({
      text: ['title,url', ...rows].join('\n'),
      mimeType: 'text/csv',
      fileName: 'a.csv',
      mode: 'folder',
      skipDuplicates: true,
    })
    expect(plan).toEqual({ kind: 'app' })
  })
})
