import { i18n } from '#i18n'
import { DownloadIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  EXPORT_FORMAT_INFO,
  EXPORT_FORMATS,
  type ExportFormat,
} from '@/lib/export-formats'
import { formatCount } from '@/lib/format-count'

interface ExportBarProperties {
  selectedCount: number
  totalCount: number
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  isExporting: boolean
  onExport: () => void
}

/**
 * The sticky bottom bar of the Export page: selection summary, format
 * toggle group and the primary Export button (disabled while nothing is
 * selected or an export is running).
 * @param properties The bar props.
 * @param properties.selectedCount How many bookmarks are selected.
 * @param properties.totalCount How many bookmarks exist.
 * @param properties.format The chosen export format.
 * @param properties.onFormatChange Called with the newly chosen format.
 * @param properties.isExporting Whether an export is currently running.
 * @param properties.onExport Called when the Export button is pressed.
 * @returns The bar markup.
 */
export function ExportBar({
  selectedCount,
  totalCount,
  format,
  onFormatChange,
  isExporting,
  onExport,
}: ExportBarProperties) {
  const hasSelection = selectedCount > 0

  return (
    <div className="sticky bottom-0 -mx-4 -mb-4 flex h-14 shrink-0 items-center gap-3 border-t bg-background px-4">
      <p
        className="min-w-0 flex-1 truncate text-sm text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {hasSelection
          ? i18n.t('exportPage_selectionCount', selectedCount, [
              formatCount(selectedCount),
              formatCount(totalCount),
            ])
          : i18n.t('exportPage_nothingSelected')}
      </p>
      <ToggleGroup
        variant="outline"
        aria-label={i18n.t('exportPage_formatLabel')}
        value={[format]}
        onValueChange={(values) => {
          const next = values[0] as ExportFormat | undefined
          if (next) onFormatChange(next)
        }}
      >
        {EXPORT_FORMATS.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {EXPORT_FORMAT_INFO[value].label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button disabled={!hasSelection || isExporting} onClick={onExport}>
        {isExporting ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <DownloadIcon data-icon="inline-start" />
        )}
        {isExporting
          ? i18n.t('exportPage_exporting')
          : i18n.t('exportPage_exportButton', selectedCount, [
              formatCount(selectedCount),
            ])}
      </Button>
    </div>
  )
}
