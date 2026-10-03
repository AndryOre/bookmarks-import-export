import { IMPORT_PROGRESS_BATCH_SIZE } from './import-control'

/**
 * A progress event emitted while an export walks the bookmarks. `done` and
 * `total` count bookmarks (not folders).
 */
export interface ExportProgress {
  done: number
  total: number
}

/**
 * Lets a caller observe and cancel an export: `onProgress` fires after every
 * batch of bookmarks and once more when the walk ends, and aborting `signal`
 * stops the export before any file is produced.
 */
export interface ExportControl {
  onProgress?: (progress: ExportProgress) => void
  signal?: AbortSignal
}

/**
 * Thrown when an export is canceled. Nothing has been downloaded.
 */
export class ExportCanceledError extends Error {
  constructor() {
    super('Export canceled')
    this.name = 'ExportCanceledError'
  }
}

/**
 * Counts bookmarks as an exporter visits them, checking the abort signal and
 * reporting progress per batch.
 */
export interface ExportTicker {
  tick: () => void
  finish: () => void
}

/**
 * Creates the ticker an exporter calls once per bookmark.
 * @param control Progress callback and abort signal.
 * @param total How many bookmarks the export will visit.
 * @returns The ticker; `tick` throws {@link ExportCanceledError} once aborted.
 */
export function createExportTicker(
  control: ExportControl,
  total: number,
): ExportTicker {
  let done = 0
  const emit = (): void => control.onProgress?.({ done, total })
  return {
    tick() {
      if (control.signal?.aborted) throw new ExportCanceledError()
      done++
      if (done % IMPORT_PROGRESS_BATCH_SIZE === 0) emit()
    },
    finish() {
      if (control.signal?.aborted) throw new ExportCanceledError()
      emit()
    },
  }
}
