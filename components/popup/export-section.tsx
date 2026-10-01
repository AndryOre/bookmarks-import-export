import { i18n } from '#i18n'
import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { exportAllBookmarks } from '@/lib/export-all-bookmarks'
import { lastExportFormatStore } from '@/lib/storage'
import type { AutoExportFormat } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

const FORMATS: AutoExportFormat[] = ['html', 'json', 'csv']

/**
 * Popup Export section: a full-width HTML/JSON/CSV toggle group that
 * remembers the last choice, and an "Export all" button that downloads in
 * that format and reports the result with a toast.
 * @returns The export section element.
 */
export function ExportSection() {
  const [format, setFormat] = useStorageItem(lastExportFormatStore)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { fileName, count } = await exportAllBookmarks(format)
      toast.add({
        type: 'success',
        title: i18n.t('popup_exportSuccessTitle', [count]),
        description: fileName,
      })
    } catch (error) {
      toast.add({
        type: 'error',
        title: i18n.t('popup_exportFailedTitle'),
        description: (error as Error).message,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <ToggleGroup
        variant="outline"
        className="w-full"
        aria-label={i18n.t('popup_exportFormatLabel')}
        value={[format]}
        onValueChange={(values) => {
          const next = values[0] as AutoExportFormat | undefined
          if (next) void setFormat(next)
        }}
      >
        {FORMATS.map((value) => (
          <ToggleGroupItem key={value} value={value} className="flex-1">
            {value.toUpperCase()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        className="w-full"
        disabled={isExporting}
        onClick={() => void handleExport()}
      >
        <DownloadIcon data-icon="inline-start" />
        {i18n.t('popup_exportAll')}
      </Button>
    </section>
  )
}
