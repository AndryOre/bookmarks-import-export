import { i18n } from '#i18n'
import { Upload } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { detectFormat } from '@/lib/detect-format'
import { importFromCSV } from '@/lib/importers/import-csv'
import { importFromHTML } from '@/lib/importers/import-html'
import { importFromJSON } from '@/lib/importers/import-json'

export function ImportBookmarksButton() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''

    try {
      const text = await file.text()
      const format = detectFormat(text, file.type)

      switch (format) {
        case 'csv':
          await importFromCSV(text)
          break
        case 'json':
          await importFromJSON(JSON.parse(text))
          break
        case 'html':
          await importFromHTML(text)
          break
        default:
          throw new Error(i18n.t('unsupportedFileFormat'))
      }

      alert(i18n.t('bookmarksImportedSuccessfully'))
    } catch (error) {
      alert((error as Error).message)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
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
