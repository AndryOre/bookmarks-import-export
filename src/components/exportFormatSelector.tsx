import { Download } from "lucide-react"
import { useState } from "react"

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~components/ui"

/**
 * ExportFormat type for the export format state
 */
export type ExportFormat = "html" | "json" | "csv"

interface ExportFormatSelectorProps {
  onExport: (format: ExportFormat) => void
}

export function ExportFormatSelector({ onExport }: ExportFormatSelectorProps) {
  const [format, setFormat] = useState<ExportFormat>("html")

  return (
    <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-w-full">
      <Select defaultValue="html" onValueChange={(value: ExportFormat) => setFormat(value)}>
        <SelectTrigger className="plasmo-w-full">
          <SelectValue placeholder="Export format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="html" className="plasmo-flex plasmo-items-center plasmo-gap-2">
            HTML
          </SelectItem>
          <SelectItem value="json" className="plasmo-flex plasmo-items-center plasmo-gap-2">
            JSON
          </SelectItem>
          <SelectItem value="csv" className="plasmo-flex plasmo-items-center plasmo-gap-2">
            CSV
          </SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={() => onExport(format)}>
        <Download className="plasmo-w-4 plasmo-h-4 plasmo-mr-2" />
        {chrome.i18n.getMessage("export")}
      </Button>
    </div>
  )
} 