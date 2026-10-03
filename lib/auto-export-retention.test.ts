import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { autoExportDownloadIdsStore } from '@/lib/storage'

import { applyRetention, recordSavedDownload } from './auto-export-retention'

/**
 * Replaces `browser.downloads.removeFile`/`erase` (unimplemented in
 * `fakeBrowser`) with `vi.fn`s; ids in `missingFileIds` make `removeFile`
 * reject like Chrome does for a file the user already deleted or moved.
 * Also stubs `downloads.search` so every recorded id resolves to a download
 * started by this extension, except `foreignIds`, which resolve to another
 * extension's or are gone.
 * @param missingFileIds Download ids whose file is gone.
 * @param foreignIds Download ids that no longer belong to Snug.
 * @returns The installed mocks.
 */
function mockDownloadsCleanup(
  missingFileIds: number[] = [],
  foreignIds: number[] = [],
) {
  const removeFile = vi.fn(async (id: number) => {
    if (missingFileIds.includes(id)) throw new Error('Download file missing.')
  })
  const erase = vi.fn<(query: { id: number }) => Promise<number[]>>(
    async () => [],
  )
  const search = vi.fn(async ({ id }: { id: number }) => [
    {
      id,
      byExtensionId: foreignIds.includes(id)
        ? 'some-other-extension'
        : browser.runtime.id,
    },
  ])
  browser.downloads.search =
    search as unknown as typeof browser.downloads.search
  browser.downloads.removeFile =
    removeFile as unknown as typeof browser.downloads.removeFile
  browser.downloads.erase = erase as unknown as typeof browser.downloads.erase
  return { removeFile, erase, search }
}

async function recordAll(ids: number[]): Promise<void> {
  for (const id of ids) await recordSavedDownload(id)
}

beforeEach(() => {
  fakeBrowser.reset()
})

describe('recordSavedDownload', () => {
  it('appends ids oldest first and persists them in storage', async () => {
    await recordAll([4, 9, 12])

    expect(await autoExportDownloadIdsStore.getValue()).toEqual([4, 9, 12])
    const raw = await fakeBrowser.storage.local.get('autoExportDownloadIds')
    expect(raw.autoExportDownloadIds).toEqual([4, 9, 12])
  })

  it('does not lose ids recorded concurrently', async () => {
    await Promise.all([1, 2, 3, 4].map((id) => recordSavedDownload(id)))

    const stored = await autoExportDownloadIdsStore.getValue()
    expect(stored.toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4])
  })
})

describe('applyRetention', () => {
  it('removes the oldest files beyond the limit, and erases their history', async () => {
    const { removeFile, erase } = mockDownloadsCleanup()
    await recordAll([1, 2, 3, 4, 5])

    await applyRetention(2)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1, 2, 3])
    expect(erase.mock.calls.map(([query]) => query)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([4, 5])
  })

  it('removes nothing when 0 is configured', async () => {
    const { removeFile, erase } = mockDownloadsCleanup()
    await recordAll([1, 2, 3])

    await applyRetention(0)

    expect(removeFile).not.toHaveBeenCalled()
    expect(erase).not.toHaveBeenCalled()
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([1, 2, 3])
  })

  it('removes nothing while at or under the limit', async () => {
    const { removeFile } = mockDownloadsCleanup()
    await recordAll([1, 2, 3])

    await applyRetention(3)

    expect(removeFile).not.toHaveBeenCalled()
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([1, 2, 3])
  })

  it('applies a lowered limit on the next call', async () => {
    const { removeFile } = mockDownloadsCleanup()
    await recordAll([1, 2, 3, 4])
    await applyRetention(4)
    expect(removeFile).not.toHaveBeenCalled()

    await applyRetention(1)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1, 2, 3])
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([4])
  })

  it('skips a missing file and still cleans up the rest', async () => {
    const { removeFile, erase } = mockDownloadsCleanup([2])
    await recordAll([1, 2, 3, 4])

    await expect(applyRetention(1)).resolves.toBeUndefined()

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1, 2, 3])
    expect(erase).toHaveBeenCalledTimes(3)
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([4])
  })

  it('never touches downloads Snug did not record', async () => {
    const { removeFile } = mockDownloadsCleanup()
    await recordAll([10, 11])

    await applyRetention(1)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([10])
  })
})

describe('applyRetention ownership check', () => {
  it('skips an id that no longer belongs to Snug and still drops it from storage', async () => {
    const { removeFile, erase } = mockDownloadsCleanup([], [2])
    await recordAll([1, 2, 3, 4])

    await applyRetention(2)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1])
    expect(erase.mock.calls.map(([query]) => query.id)).toEqual([1])
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([3, 4])
  })
})
