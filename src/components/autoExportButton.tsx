import { CalendarSync } from "lucide-react"

import { Button } from "~components/ui"

/**
 * AutoExportButton component for triggering auto export functionality.
 * This button opens auto export options for exporting bookmarks.
 */
export const AutoExportButton = ({ className = "" }): JSX.Element => {
  const handleAutoExport = () => {
    chrome.tabs.create({ url: "tabs/auto-export.html" })
  }

  return (
    <Button onClick={handleAutoExport} variant="link" className={className}>
      <CalendarSync />
      {chrome.i18n.getMessage("autoExport")}
    </Button>
  )
}
