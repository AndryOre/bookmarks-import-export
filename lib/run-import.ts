import { i18n } from '#i18n'

import { detectFormat } from './detect-format'
import { ImportCanceledError, markImportRestored } from './import-control'
import { withImportLock } from './import-lock'
import { parseChromeBookmarks } from './importers/import-chrome'
import { importFromCSV } from './importers/import-csv'
import { importFromHTML } from './importers/import-html'
import { importParsedTree } from './importers/import-json'
import { parseSafari } from './importers/import-safari'
import { parseXBEL } from './importers/import-xbel'
import { parseLocationAwareImport } from './importers/parse-import'
import { loadLiveRootTitles } from './importers/resolve-roots'
import {
  hasRewrittenRootsFully,
  type SafetySnapshot,
  takeSafetySnapshot,
} from './safety-snapshot'
import type { ImportMode, ImportOptions, ImportResult } from './types'

/**
 * An {@link ImportResult} plus the Safety snapshot the import took, if any.
 */
export interface RunImportResult extends ImportResult {
  snapshot?: SafetySnapshot
}

/**
 * Imports the raw content of a bookmarks file into the browser's bookmark
 * tree, dispatching on the detected format. CSV has no location data, so it
 * ignores `mode` and always imports into a folder, as does an XBEL file whose
 * folders name no browser root. Before a Restore-replace of any other format, a Safety snapshot is taken; if it cannot be saved the
 * error is thrown and nothing is deleted.
 * @param text The raw file content.
 * @param mimeType The file's MIME type, used to help detect its format.
 * @param mode How the bookmarks are written into the existing tree.
 * @param fileName The file's name, a fallback hint when the MIME type fails.
 * @param options Import options; `skipDuplicates` is ignored in Restore-replace.
 *   `signal` cancels the import and `onProgress` reports each batch.
 * @returns The import result, including the skipped-bookmark count and, for
 *   a Restore-replace, the Safety snapshot this import took (for Undo).
 * @throws {ImportLockHeldError} When another extension page is importing.
 * @throws {ImportCanceledError} After a cancel, once the bookmarks are back to
 *   their previous state (Restore-replace restores the Safety snapshot).
 * @throws {Error} When the format is unsupported or the importer fails; the
 *   original error is rethrown after a rollback, and after a Safety snapshot
 *   restore when existing bookmarks were already cleared.
 */
export function runImport(
  text: string,
  mimeType: string,
  mode: ImportMode,
  fileName?: string,
  options: ImportOptions = {},
): Promise<RunImportResult> {
  return withImportLock(() =>
    runImportUnlocked(text, mimeType, mode, fileName, options),
  )
}

async function runImportUnlocked(
  text: string,
  mimeType: string,
  mode: ImportMode,
  fileName: string | undefined,
  options: ImportOptions,
): Promise<RunImportResult> {
  let snapshot: SafetySnapshot | undefined
  let hasClearedExisting = false
  try {
    const result = await importWithSnapshot(
      text,
      mimeType,
      mode,
      fileName,
      {
        ...options,
        onClearingExisting: () => {
          hasClearedExisting = true
          options.onClearingExisting?.()
        },
      },
      (taken) => {
        snapshot = taken
      },
    )
    return snapshot ? { ...result, snapshot } : result
  } catch (error) {
    const wasCleared =
      hasClearedExisting ||
      (error instanceof ImportCanceledError && error.hasClearedExisting)
    if (snapshot && wasCleared) {
      await restoreSnapshot(snapshot, error)
    }
    throw error
  }
}

async function restoreSnapshot(
  snapshot: SafetySnapshot,
  originalError: unknown,
): Promise<void> {
  try {
    if (await hasRewrittenRootsFully(snapshot.roots)) {
      markImportRestored(originalError)
    }
  } catch (restoreError) {
    console.error('Safety snapshot restore failed', restoreError)
  }
}

async function importWithSnapshot(
  text: string,
  mimeType: string,
  mode: ImportMode,
  fileName: string | undefined,
  options: ImportOptions,
  onSnapshot: (snapshot: SafetySnapshot) => void,
): Promise<ImportResult> {
  const format = detectFormat(text, mimeType, fileName)
  const snapshotBeforeReplace = async (): Promise<void> => {
    if (mode !== 'restore-replace') return
    if (options.signal?.aborted) throw new ImportCanceledError(false)
    onSnapshot(await takeSafetySnapshot())
  }

  switch (format) {
    case 'html': {
      await snapshotBeforeReplace()
      return importFromHTML(text, mode, options)
    }
    case 'json': {
      const parsed = parseLocationAwareImport(text, 'json')
      await snapshotBeforeReplace()
      return importParsedTree(parsed?.tree ?? [], mode, options)
    }
    case 'chrome': {
      const tree = parseChromeBookmarks(text)
      await snapshotBeforeReplace()
      return importParsedTree(tree, mode, options)
    }
    case 'xbel': {
      const { tree, hasLocationData } = parseXBEL(
        text,
        await loadLiveRootTitles(),
      )
      const effectiveMode = hasLocationData ? mode : 'folder'
      if (effectiveMode !== mode)
        return importParsedTree(tree, 'folder', options)
      await snapshotBeforeReplace()
      return importParsedTree(tree, mode, options)
    }
    case 'safari': {
      const tree = parseSafari(text, await loadLiveRootTitles())
      await snapshotBeforeReplace()
      return importParsedTree(tree, mode, options)
    }
    case 'csv': {
      return importFromCSV(text, options)
    }
    default: {
      throw new Error(i18n.t('unsupportedFileFormat'))
    }
  }
}
