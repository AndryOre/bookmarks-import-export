import { useCallback, useEffect, useRef, useState } from "react"

import { exportToHTML, exportToJSON } from "~common/lib"
import type {
  BookmarkTreeHandle,
  ExtendedBookmarkTreeNode
} from "~common/types"
import { BookmarkTree, Header } from "~components"

import "~style.css"

/**
 * AdvancedExportPage component for handling advanced bookmark export functionality.
 * This component provides a user interface for selecting, searching, and exporting bookmarks.
 *
 * @returns {JSX.Element} The rendered AdvancedExportPage component
 */
export default function AdvancedExportPage(): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCount, setSelectedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [includeDates, setIncludeDates] = useState(true)
  const [hideOtherBookmarks, setHideOtherBookmarks] = useState(true)
  const [hideParentFolder, setHideParentFolder] = useState(false)
  const bookmarkTreeRef = useRef<BookmarkTreeHandle>(null)

  /**
   * Load initial settings from localStorage
   */
  useEffect(() => {
    const loadSetting = (key: string, setter: (value: boolean) => void) => {
      const loadedValue = localStorage.getItem(key)
      if (loadedValue !== null) {
        setter(JSON.parse(loadedValue))
      }
    }

    loadSetting("includeDates", setIncludeDates)
    loadSetting("hideOtherBookmarks", setHideOtherBookmarks)
    loadSetting("hideParentFolder", setHideParentFolder)
  }, [])

  /**
   * Handle settings changes
   */
  useEffect(() => {
    const handleSettingsChange = () => {
      const loadSetting = (key: string, setter: (value: boolean) => void) => {
        const newValue = localStorage.getItem(key)
        if (newValue !== null) {
          setter(JSON.parse(newValue))
        }
      }

      loadSetting("hideOtherBookmarks", setHideOtherBookmarks)
      loadSetting("hideParentFolder", setHideParentFolder)
    }

    window.addEventListener("settingsChanged", handleSettingsChange)
    return () => {
      window.removeEventListener("settingsChanged", handleSettingsChange)
    }
  }, [])

  /**
   * Refresh the bookmark tree
   */
  const handleRefresh = () => {
    bookmarkTreeRef.current?.refresh()
  }

  /**
   * Select all bookmarks in the tree
   */
  const handleSelectAll = () => {
    bookmarkTreeRef.current?.selectAll()
  }

  /**
   * Deselect all bookmarks in the tree
   */
  const handleDeselectAll = () => {
    bookmarkTreeRef.current?.deselectAll()
  }

  /**
   * Handle changes in bookmark selection
   * @param {number} selected - Number of selected bookmarks
   * @param {number} total - Total number of bookmarks
   */
  const handleSelectionChange = useCallback(
    (selected: number, total: number) => {
      setSelectedCount(selected)
      setTotalCount(total)
    },
    []
  )

  /**
   * Export selected bookmarks in the specified format
   * @param {("html" | "json")} format - The format to export bookmarks in
   */
  const handleExport = async (format: "html" | "json") => {
    if (!bookmarkTreeRef.current) {
      console.error("Bookmark tree reference is not available")
      return
    }

    try {
      const selectedBookmarks =
        await bookmarkTreeRef.current.getSelectedBookmarks()
      if (!selectedBookmarks || selectedBookmarks.length === 0) {
        console.error("No bookmarks selected")
        return
      }

      const includeIconData = localStorage.getItem("includeIconData") === "true"
      const exportConfig = {
        selectedBookmarks,
        includeIconData,
        includeDates,
        hideOtherBookmarks,
        hideParentFolder
      }

      const { exportedData, fileName, mimeType } = await exportBookmarks(
        format,
        exportConfig
      )

      downloadFile(exportedData, fileName, mimeType)
    } catch (error) {
      console.error("Error exporting bookmarks:", error)
    }
  }

  /**
   * Export bookmarks based on the specified format and configuration
   * @param {("html" | "json")} format - The format to export bookmarks in
   * @param {Object} config - Export configuration
   * @returns {Promise<{exportedData: string, fileName: string, mimeType: string}>} Export result
   */
  const exportBookmarks = async (
    format: "html" | "json",
    config: {
      selectedBookmarks: ExtendedBookmarkTreeNode[]
      includeIconData: boolean
      includeDates: boolean
      hideOtherBookmarks: boolean
      hideParentFolder: boolean
    }
  ): Promise<{ exportedData: string; fileName: string; mimeType: string }> => {
    if (format === "html") {
      const exportedData = await exportToHTML(
        config.selectedBookmarks,
        config.includeIconData,
        config.includeDates,
        config.hideOtherBookmarks,
        config.hideParentFolder
      )
      return { exportedData, fileName: "bookmarks.html", mimeType: "text/html" }
    } else {
      const jsonData = await exportToJSON(
        config.selectedBookmarks,
        config.includeIconData,
        config.includeDates,
        config.hideOtherBookmarks,
        config.hideParentFolder
      )
      const exportedData = JSON.stringify(jsonData, null, 2)
      return {
        exportedData,
        fileName: "bookmarks.json",
        mimeType: "application/json"
      }
    }
  }

  /**
   * Download a file with the given content, filename, and MIME type
   * @param {string} content - The content of the file
   * @param {string} fileName - The name of the file
   * @param {string} mimeType - The MIME type of the file
   */
  const downloadFile = (
    content: string,
    fileName: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-h-screen plasmo-overflow-hidden">
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        selectedCount={selectedCount}
        totalCount={totalCount}
        onExport={handleExport}
      />
      <div className="plasmo-flex-grow plasmo-overflow-hidden plasmo-p-6">
        <BookmarkTree
          ref={bookmarkTreeRef}
          searchTerm={searchTerm}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </div>
  )
}
