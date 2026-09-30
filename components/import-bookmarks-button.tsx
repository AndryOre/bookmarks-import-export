import { i18n } from '#i18n'
import { Upload } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { detectFormat } from '@/lib/detect-format'
import { importFromCSV } from '@/lib/importers/import-csv'
import { importFromHTML } from '@/lib/importers/import-html'
import { importFromJSON } from '@/lib/importers/import-json'

/**
 * Quick-import entry point: picks a bookmarks file and imports it
 * immediately in `folder` mode (added under a new folder), without
 * exposing the restore modes that {@link ImportModeSelector} offers in the
 * Advanced Import flow.
 */
export function ImportBookmarksButton() {
  const fileInputReference = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    fileInputReference.current?.click()
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    event.target.value = ''

    try {
      const text = await file.text()
      const format = detectFormat(text, file.type)

      switch (format) {
        case 'csv': {
          await importFromCSV(text)
          break
        }
        case 'json': {
          await importFromJSON(JSON.parse(text))
          break
        }
        case 'html': {
          await importFromHTML(text)
          break
        }
        default: {
          throw new Error(i18n.t('unsupportedFileFormat'))
        }
      }

      alert(i18n.t('bookmarksImportedSuccessfully'))
    } catch (error) {
      alert((error as Error).message)
    }
  }

  return (
    <>
      <input
        ref={fileInputReference}
        type="file"
        accept=".csv,.json,.html,.htm"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        className="w-full"
      >
        <Upload className="mr-2 size-4" />
        {i18n.t('importBookmarks')}
      </Button>
    </>
  )
}
