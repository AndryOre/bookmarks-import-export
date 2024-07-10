import { useRef } from "react"

import { Button } from "~components/ui"
import { importBookmarks } from "~lib"

import { Input } from "./ui/input"

export const ImportBookmarksButton = () => {
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
        const bookmarks = JSON.parse(text)
        await importBookmarks(bookmarks)
        alert("Bookmarks imported successfully!")
      } catch (error) {
        console.error("Error importing bookmarks:", error)
        alert("Failed to import bookmarks.")
      }
    }
  }

  return (
    <>
      <Button onClick={handleButtonClick}>Import</Button>
      <Input
        ref={fileInputRef}
        type="file"
        onChange={handleImport}
        className="plasmo-hidden"
      />
    </>
  )
}
