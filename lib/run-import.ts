import { i18n } from '#i18n'

import { detectFormat } from './detect-format'
import { importFromCSV } from './importers/import-csv'
import { importFromHTML } from './importers/import-html'
import { importFromJSON } from './importers/import-json'
import type { ImportMode } from './types'

/**
 * Imports the raw content of a bookmarks file into the browser's bookmark
 * tree, dispatching on the detected format. CSV has no location data, so it
 * ignores `mode` and always imports into a folder.
 * @param text The raw file content.
 * @param mimeType The file's MIME type, used to help detect its format.
 * @param mode How the bookmarks are written into the existing tree.
 * @throws {Error} When the format is unsupported or the importer fails.
 */
export async function runImport(
  text: string,
  mimeType: string,
  mode: ImportMode,
): Promise<void> {
  const format = detectFormat(text, mimeType)

  switch (format) {
    case 'html': {
      await importFromHTML(text, mode)
      break
    }
    case 'json': {
      await importFromJSON(JSON.parse(text), mode)
      break
    }
    case 'csv': {
      await importFromCSV(text)
      break
    }
    default: {
      throw new Error(i18n.t('unsupportedFileFormat'))
    }
  }
}
