import { Upload } from "lucide-react"
import { useRef } from "react"

import { Button } from "~components/ui"
import { detectFormat, importFromHTML, importFromJSON } from "~lib"

/**
 * ImportBookmarksButton component for importing bookmarks from a file.
 * This button triggers a file selection dialog and imports bookmarks from the selected file.
 */
export const ImportBookmarksButton = ({ className = "" }): JSX.Element => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const text = await file.text()
        const format = detectFormat(text, file.type)

        switch (format) {
          case "json":
            const bookmarks = JSON.parse(text)
            await importFromJSON(bookmarks)
            break
          case "html":
            await importFromHTML(text)
            break
          default:
            throw new Error("Unsupported file format.")
        }

        alert("Bookmarks imported successfully!")
      } catch (error) {
        console.error("Error importing bookmarks:", error)
        alert("Failed to import bookmarks.")
      }
    }
  }

  return (
    <>
      <Button onClick={handleButtonClick} className={className}>
        <Upload className="plasmo-mr-2 plasmo-h-4 plasmo-w-4" />
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.html,.htm"
        onChange={handleImport}
        className="plasmo-hidden"
      />
    </>
  )
}
