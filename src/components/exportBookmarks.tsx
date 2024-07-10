import { Button } from "~components/ui"
import { exportBookmarks } from "~lib"

export const ExportBookmarksButton = () => {
  const handleExport = async () => {
    try {
      const bookmarks = await exportBookmarks()
      const json = JSON.stringify(bookmarks, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Bookmarks.json`
      a.click()
    } catch (error) {
      console.error("Error exporting bookmarks:", error)
    }
  }

  return <Button onClick={handleExport}>Export</Button>
}
