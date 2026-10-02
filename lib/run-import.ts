import { i18n } from '#i18n'

import { detectFormat } from './detect-format'
import { importFromCSV } from './importers/import-csv'
import { importFromHTML } from './importers/import-html'
import { importFromJSON, normalizeJsonRoot } from './importers/import-json'
import { takeSafetySnapshot } from './safety-snapshot'
import type { ImportMode, ImportResult } from './types'

/**
 * Imports the raw content of a bookmarks file into the browser's bookmark
 * tree, dispatching on the detected format. CSV has no location data, so it
 * ignores `mode` and always imports into a folder. Before a Restore-replace of
 * HTML or JSON content, a Safety snapshot is taken; if it cannot be saved the
 * error is thrown and nothing is deleted.
 * @param text The raw file content.
 * @param mimeType The file's MIME type, used to help detect its format.
 * @param mode How the bookmarks are written into the existing tree.
 * @param fileName The file's name, a fallback hint when the MIME type fails.
 * @returns The import result, including the skipped-bookmark count.
 * @throws {Error} When the format is unsupported or the importer fails.
 */
export async function runImport(
  text: string,
  mimeType: string,
  mode: ImportMode,
  fileName?: string,
): Promise<ImportResult> {
  const format = detectFormat(text, mimeType, fileName)

  switch (format) {
    case 'html': {
      if (mode === 'restore-replace') await takeSafetySnapshot()
      return importFromHTML(text, mode)
    }
    case 'json': {
      const roots = normalizeJsonRoot(JSON.parse(text))
      if (mode === 'restore-replace') await takeSafetySnapshot()
      return importFromJSON(roots, mode)
    }
    case 'csv': {
      return importFromCSV(text)
    }
    default: {
      throw new Error(i18n.t('unsupportedFileFormat'))
    }
  }
}
