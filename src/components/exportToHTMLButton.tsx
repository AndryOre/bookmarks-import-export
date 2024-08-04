import { FileText } from "lucide-react"

import { Button } from "~components/ui"
import { exportToHTML } from "~lib"

/**
 * ExportToHTMLButton component for exporting bookmarks to HTML format.
 * This button triggers the export of bookmarks to an HTML file.
 */
export const ExportToHTMLButton = ({ className = "" }): JSX.Element => {
  const handleExport = async () => {
    try {
      const bookmarks = await exportToHTML()
      const blob = new Blob([bookmarks], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "Bookmarks.html"
      link.click()
    } catch (error) {
      console.error("Error exporting bookmarks:", error)
    }
  }

  return (
    <Button onClick={handleExport} className={className}>
      <FileText className="plasmo-mr-2 plasmo-h-4 plasmo-w-4" />
      HTML
    </Button>
  )
}
