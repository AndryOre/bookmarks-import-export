import { i18n } from '#i18n'
import { Download } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BookmarkFormat } from '@/lib/types'

interface ExportFormatSelectorProps {
  onExport: (format: BookmarkFormat) => void
}

export function ExportFormatSelector({ onExport }: ExportFormatSelectorProps) {
  const [format, setFormat] = useState<BookmarkFormat>('html')

  return (
    <div className="flex gap-2">
      <Select
        value={format}
        onValueChange={(v) => setFormat(v as BookmarkFormat)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={i18n.t('exportFormat')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="html">HTML</SelectItem>
          <SelectItem value="json">JSON</SelectItem>
          <SelectItem value="csv">CSV</SelectItem>
        </SelectContent>
      </Select>

      <Button
        size="icon"
        onClick={() => onExport(format)}
        aria-label={i18n.t('exportFormat')}
      >
        <Download className="size-4" />
      </Button>
    </div>
  )
}
