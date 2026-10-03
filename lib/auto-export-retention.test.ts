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

/**
 * Records `ids` as the downloads of one run started at `runAt`.
 * @param runAt The run's start time.
 * @param ids The run's download ids, oldest first.
 */
async function recordRun(runAt: number, ids: number[]): Promise<void> {
  for (const id of ids) await recordSavedDownload(id, runAt)
}

function runsOf(...idGroups: number[][]) {
  return idGroups.map((ids, index) => ({ runAt: index + 1, ids }))
}

beforeEach(() => {
  fakeBrowser.reset()
})

describe('recordSavedDownload', () => {
  it('groups ids of the same run together and persists them', async () => {
    await recordRun(100, [4, 9, 12])
    await recordRun(200, [20])

    const expected = [
      { runAt: 100, ids: [4, 9, 12] },
      { runAt: 200, ids: [20] },
    ]
    expect(await autoExportDownloadIdsStore.getValue()).toEqual(expected)
    const raw = await fakeBrowser.storage.local.get('autoExportDownloadIds')
    expect(raw.autoExportDownloadIds).toEqual(expected)
  })

  it('keeps overlapping runs apart instead of splitting one run in two', async () => {
    await recordSavedDownload(1, 100)
    await recordSavedDownload(2, 200)
    await recordSavedDownload(3, 100)

    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 100, ids: [1, 3] },
      { runAt: 200, ids: [2] },
    ])
  })

  it('does not lose ids recorded concurrently', async () => {
    await Promise.all([1, 2, 3, 4].map((id) => recordSavedDownload(id, 50)))

    const [run, ...rest] = await autoExportDownloadIdsStore.getValue()
    expect(rest).toEqual([])
    expect(run?.runAt).toBe(50)
    expect(run?.ids.toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4])
  })
})

describe('legacy flat id list migration', () => {
  it('turns each legacy id into its own run so nothing extra is deleted', async () => {
    await fakeBrowser.storage.local.set({ autoExportDownloadIds: [7, 8, 9] })
    await autoExportDownloadIdsStore.migrate()

    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 0, ids: [7] },
      { runAt: 0, ids: [8] },
      { runAt: 0, ids: [9] },
    ])
  })

  it('applies retention to migrated ids exactly as it did to files', async () => {
    const { removeFile } = mockDownloadsCleanup()
    await fakeBrowser.storage.local.set({ autoExportDownloadIds: [7, 8, 9] })
    await autoExportDownloadIdsStore.migrate()

    await applyRetention(2)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([7])
  })
})

describe('applyRetention', () => {
  it('keeps every file of the last N runs and removes only older runs', async () => {
    const { removeFile, erase } = mockDownloadsCleanup()
    await recordRun(1, [1, 2, 3])
    await recordRun(2, [4, 5, 6])
    await recordRun(3, [7, 8, 9])

    await applyRetention(2)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1, 2, 3])
    expect(erase.mock.calls.map(([query]) => query)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 2, ids: [4, 5, 6] },
      { runAt: 3, ids: [7, 8, 9] },
    ])
  })

  it('keeps all files of the previous run when a run has more files than the limit', async () => {
    const { removeFile } = mockDownloadsCleanup()
    await recordRun(1, [1, 2, 3, 4, 5, 6])
    await recordRun(2, [7, 8, 9, 10, 11, 12])

    await applyRetention(10)

    expect(removeFile).not.toHaveBeenCalled()
  })

  it('removes nothing when 0 is configured', async () => {
    const { removeFile, erase } = mockDownloadsCleanup()
    await recordRun(1, [1, 2])
    await recordRun(2, [3])

    await applyRetention(0)

    expect(removeFile).not.toHaveBeenCalled()
    expect(erase).not.toHaveBeenCalled()
    expect(await autoExportDownloadIdsStore.getValue()).toEqual(
      runsOf([1, 2], [3]),
    )
  })

  it('applies a lowered limit on the next call', async () => {
    const { removeFile } = mockDownloadsCleanup()
    await recordRun(1, [1, 2])
    await recordRun(2, [3, 4])
    await applyRetention(2)
    expect(removeFile).not.toHaveBeenCalled()

    await applyRetention(1)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1, 2])
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 2, ids: [3, 4] },
    ])
  })

  it('skips a missing file and still cleans up the rest', async () => {
    const { removeFile, erase } = mockDownloadsCleanup([2])
    await recordRun(1, [1, 2])
    await recordRun(2, [3])

    await expect(applyRetention(1)).resolves.toBeUndefined()

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1, 2])
    expect(erase).toHaveBeenCalledTimes(2)
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 2, ids: [3] },
    ])
  })
})

describe('applyRetention ownership check', () => {
  it('skips an id that no longer belongs to Snug and still drops it from storage', async () => {
    const { removeFile, erase } = mockDownloadsCleanup([], [2])
    await recordRun(1, [1, 2])
    await recordRun(2, [3])

    await applyRetention(1)

    expect(removeFile.mock.calls.map(([id]) => id)).toEqual([1])
    expect(erase.mock.calls.map(([query]) => query.id)).toEqual([1])
    expect(await autoExportDownloadIdsStore.getValue()).toEqual([
      { runAt: 2, ids: [3] },
    ])
  })
})
