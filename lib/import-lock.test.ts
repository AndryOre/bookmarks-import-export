import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { IMPORT_LOCK_NAME, ImportLockHeldError } from './import-lock'
import { runImport } from './run-import'
import { readLatestSafetySnapshot } from './safety-snapshot'
import { resetFakeBookmarks } from './testing/fake-bookmarks'

vi.mock('./offscreen-download', () => ({
  downloadViaOffscreenDocument: vi.fn(async () => 1),
}))

const CSV = 'title,url\nA,https://a.example/\n'
const JSON_ROOT = JSON.stringify({
  id: '1',
  title: 'Bookmarks bar',
  dateAdded: 0,
  children: [{ title: 'N', url: 'https://n.example/', dateAdded: 0 }],
})

describe('runImport cross-context lock', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    resetFakeBookmarks()
  })

  it('exports the lock name', () => {
    expect(IMPORT_LOCK_NAME).toBe('snug-import')
  })

  it('fails fast while another import holds the lock, leaving the first unaffected', async () => {
    const { promise: held, resolve: release } = Promise.withResolvers<void>()
    const first = navigator.locks.request(
      IMPORT_LOCK_NAME,
      { ifAvailable: true },
      () => held,
    )
    await expect(runImport(CSV, 'text/csv', 'folder')).rejects.toBeInstanceOf(
      ImportLockHeldError,
    )
    release()
    await first
    await expect(runImport(CSV, 'text/csv', 'folder')).resolves.toBeDefined()
  })

  it('returns the snapshot this restore-replace import took', async () => {
    const result = await runImport(
      JSON_ROOT,
      'application/json',
      'restore-replace',
    )
    const latest = await readLatestSafetySnapshot()
    expect(result.snapshot).toBeDefined()
    expect(result.snapshot).toEqual(latest)
  })

  it('returns no snapshot for a non-destructive import', async () => {
    const result = await runImport(CSV, 'text/csv', 'folder')
    expect(result.snapshot).toBeUndefined()
  })
})
