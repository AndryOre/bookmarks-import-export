import { Code } from "lucide-react"

import { Button } from "~components/ui"
import { exportToJSON } from "~lib"

/**
 * ExportToJSONButton component for exporting bookmarks to JSON format.
 * This button triggers the export of bookmarks to a JSON file.
 */
export const ExportToJSONButton = ({ className = "" }): JSX.Element => {
  const handleExport = async () => {
    try {
      const bookmarks = await exportToJSON()
      const json = JSON.stringify(bookmarks, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "Bookmarks.json"
      link.click()
    } catch (error) {
      console.error("Error exporting bookmarks:", error)
    }
  }

  return (
    <Button onClick={handleExport} className={className}>
      <Code className="plasmo-mr-2 plasmo-h-4 plasmo-w-4" />
      JSON
    </Button>
  )
}
