import { Settings } from "lucide-react"

import { Button } from "~components/ui"

/**
 * AdvancedExportButton component for triggering advanced export functionality.
 * This button opens advanced options for exporting bookmarks.
 */
export const AdvancedExportButton = ({ className = "" }): JSX.Element => {
  const handleAdvancedExport = () => {
    console.log("Advanced Export clicked")
    // TODO: Implement advanced export functionality
  }

  return (
    <Button onClick={handleAdvancedExport} variant="link" className={className}>
      <Settings className="plasmo-mr-2 plasmo-h-4 plasmo-w-4" />
      Advanced Export
    </Button>
  )
}
