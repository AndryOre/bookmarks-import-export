import { i18n } from '#i18n'
import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'

import { OperationProgressCard } from '@/components/operation-progress-card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { exportAllBookmarks } from '@/lib/export-all-bookmarks'
import { ExportCanceledError } from '@/lib/export-control'
import {
  EXPORT_FORMAT_INFO,
  EXPORT_FORMATS,
  type ExportFormat,
  POPUP_TOGGLE_FORMAT_LIMIT,
} from '@/lib/export-formats'
import { formatCount } from '@/lib/format-count'
import { lastExportFormatStore } from '@/lib/storage'
import { useOperationProgress } from '@/lib/use-operation-progress'
import { useStorageItem } from '@/lib/use-storage-item'

const formatItems = EXPORT_FORMATS.map((value) => ({
  value,
  label: EXPORT_FORMAT_INFO[value].label,
}))

/**
 * Popup Export section: a full-width format picker (a toggle group up to
 * three formats, a Select beyond that) that remembers the last choice, and an "Export all" button that downloads in
 * that format and reports the result with a toast.
 * @returns The export section element.
 */
export function ExportSection() {
  const [format, setFormat] = useStorageItem(lastExportFormatStore)
  const [isExporting, setIsExporting] = useState(false)
  const progress = useOperationProgress()

  const handleExport = async () => {
    setIsExporting(true)
    const signal = progress.begin()
    try {
      const { fileName, count } = await exportAllBookmarks(format, {
        signal,
        onProgress: progress.report,
      })
      toast.add({
        type: 'success',
        title: i18n.t('popup_exportSuccessTitle', count, [formatCount(count)]),
        description: fileName,
      })
    } catch (error) {
      toast.add(
        error instanceof ExportCanceledError
          ? {
              title: i18n.t('progress_exportCanceledTitle'),
              description: i18n.t('progress_exportCanceledDescription'),
            }
          : {
              type: 'error',
              title: i18n.t('popup_exportFailedTitle'),
              description: (error as Error).message,
            },
      )
    } finally {
      progress.end()
      setIsExporting(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      {EXPORT_FORMATS.length > POPUP_TOGGLE_FORMAT_LIMIT ? (
        <Select
          items={formatItems}
          value={format}
          onValueChange={(value) => void setFormat(value as ExportFormat)}
        >
          <SelectTrigger
            className="w-full"
            aria-label={i18n.t('popup_exportFormatLabel')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {EXPORT_FORMATS.map((value) => (
                <SelectItem key={value} value={value}>
                  {EXPORT_FORMAT_INFO[value].label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <ToggleGroup
          variant="outline"
          className="w-full"
          aria-label={i18n.t('popup_exportFormatLabel')}
          value={[format]}
          onValueChange={(values) => {
            const next = values[0] as ExportFormat | undefined
            if (next) void setFormat(next)
          }}
        >
          {EXPORT_FORMATS.map((value) => (
            <ToggleGroupItem key={value} value={value} className="flex-1">
              {EXPORT_FORMAT_INFO[value].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      <Button
        className="w-full"
        disabled={isExporting}
        onClick={() => void handleExport()}
      >
        <DownloadIcon data-icon="inline-start" />
        {i18n.t('popup_exportAll')}
      </Button>
      {progress.state.isCardVisible && (
        <OperationProgressCard
          kind="export"
          state={progress.state}
          onCancel={progress.requestCancel}
        />
      )}
    </section>
  )
}
