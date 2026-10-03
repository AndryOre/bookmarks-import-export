import {
  autoExportDownloadIdsStore,
  type AutoExportDownloadRun,
} from '@/lib/storage'

const writeQueue: { tail: Promise<void> } = { tail: Promise.resolve() }

/**
 * Serializes read-modify-write cycles on {@link autoExportDownloadIdsStore},
 * so concurrent per-format downloads can't overwrite each other's ids.
 * @param update Receives the current runs and returns the runs to persist.
 * @returns Resolves once the new ids are persisted.
 */
async function updateDownloadIds(
  update: (
    runs: AutoExportDownloadRun[],
  ) => Promise<AutoExportDownloadRun[]> | AutoExportDownloadRun[],
): Promise<void> {
  const previous = writeQueue.tail
  const { promise: gate, resolve: releaseGate } = Promise.withResolvers<void>()
  writeQueue.tail = gate

  try {
    await previous
    const runs = await autoExportDownloadIdsStore.getValue()
    await autoExportDownloadIdsStore.setValue(await update(runs))
  } finally {
    releaseGate()
  }
}

/**
 * Persists the id of a download Snug just saved for auto-export, so
 * {@link applyRetention} can later remove it — and only it — even after the
 * service worker restarts.
 * @param downloadId The id `browser.downloads.download` returned.
 * @param runAt Start time of the run that saved it; ids sharing a `runAt` are
 * grouped into one run.
 * @returns Resolves once the id is persisted.
 */
export function recordSavedDownload(
  downloadId: number,
  runAt: number,
): Promise<void> {
  return updateDownloadIds((runs) => {
    const runIndex = runs.findIndex((run) => run.runAt === runAt)
    return runIndex === -1
      ? [...runs, { runAt, ids: [downloadId] }]
      : runs.map((run, index) =>
          index === runIndex ? { runAt, ids: [...run.ids, downloadId] } : run,
        )
  })
}

/**
 * Checks that a recorded id still refers to a download this extension
 * created. Chrome can reuse ids after the user clears download history, so a
 * stale id may now point at one of the user's own files.
 * @param downloadId The recorded download id.
 * @returns `true` only when the download exists and was started by Snug.
 */
async function isOwnDownload(downloadId: number): Promise<boolean> {
  try {
    const [item] = await browser.downloads.search({ id: downloadId })
    return item?.byExtensionId === browser.runtime.id
  } catch {
    return false
  }
}

/**
 * Removes one of Snug's own saved files and its history entry. An id that no
 * longer refers to a Snug download is skipped untouched. A file the user
 * already deleted or moved makes `removeFile` reject; that is expected and
 * not an error, so each step is attempted independently.
 * @param downloadId The recorded download to clean up.
 * @returns Resolves once both steps have been attempted.
 */
async function removeSavedDownload(downloadId: number): Promise<void> {
  if (!(await isOwnDownload(downloadId))) return
  try {
    await browser.downloads.removeFile(downloadId)
  } catch {}
  try {
    await browser.downloads.erase({ id: downloadId })
  } catch {}
}

/**
 * Retention: keeps only the files of the newest `keepLast` runs Snug saved,
 * removing every file of older runs with `downloads.removeFile` and erasing
 * their history entries. Only ids recorded by {@link recordSavedDownload} are
 * ever touched, never other files in the folder. `0` keeps everything. Never
 * throws for a missing file; the rest are still cleaned up.
 * @param keepLast How many of the newest runs to keep; `0` keeps all.
 * @returns Resolves once the excess runs have been handled.
 */
export async function applyRetention(keepLast: number): Promise<void> {
  if (keepLast <= 0) return
  await updateDownloadIds(async (runs) => {
    const excessCount = Math.max(0, runs.length - keepLast)
    for (const run of runs.slice(0, excessCount)) {
      for (const downloadId of run.ids) await removeSavedDownload(downloadId)
    }
    return runs.slice(excessCount)
  })
}
