import { useCallback, useRef, useState } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import { exportToCSV, exportToHTML, exportToJSON } from "~common/lib"
import type {
  BookmarkTreeHandle,
  ExtendedBookmarkTreeNode
} from "~common/types"
import { BookmarkTree, Header, ThemeProvider } from "~components"

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

  const [includeDateAdded] = useStorage("includeDateAdded", true)
  const [includeDateLastUsed] = useStorage("includeDateLastUsed", false)
  const [includeDateGroupModified] = useStorage(
    "includeDateGroupModified",
    true
  )
  const [hideOtherBookmarks] = useStorage("hideOtherBookmarks", true)
  const [hideParentFolder] = useStorage("hideParentFolder", false)
  const [includeIconData] = useStorage("includeIconData", false)

  const bookmarkTreeRef = useRef<BookmarkTreeHandle>(null)

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
   * @param {("html" | "json" | "csv")} format - The format to export bookmarks in
   */
  const handleExport = async (format: "html" | "json" | "csv") => {
    if (!bookmarkTreeRef.current) {
      console.error(chrome.i18n.getMessage("bookmarkTreeRefNotAvailable"))
      return
    }

    try {
      const selectedBookmarks =
        await bookmarkTreeRef.current.getSelectedBookmarks()
      if (!selectedBookmarks || selectedBookmarks.length === 0) {
        console.error(chrome.i18n.getMessage("noBookmarksSelected"))
        return
      }

      const exportConfig = {
        selectedBookmarks,
        includeIconData,
        includeDateAdded,
        includeDateLastUsed,
        includeDateGroupModified,
        hideOtherBookmarks,
        hideParentFolder
      }

      const { exportedData, fileName, mimeType } = await exportBookmarks(
        format,
        exportConfig
      )

      downloadFile(exportedData, fileName, mimeType)
    } catch (error) {
      console.error(chrome.i18n.getMessage("exportError"), error)
    }
  }

  /**
   * Export bookmarks based on the specified format and configuration
   * @param {("html" | "json" | "csv")} format - The format to export bookmarks in
   * @param {Object} config - Export configuration
   * @returns {Promise<{exportedData: string, fileName: string, mimeType: string}>} Export result
   */
  const exportBookmarks = async (
    format: "html" | "json" | "csv",
    config: {
      selectedBookmarks: ExtendedBookmarkTreeNode[]
      includeIconData: boolean
      includeDateAdded: boolean
      includeDateLastUsed: boolean
      includeDateGroupModified: boolean
      hideOtherBookmarks: boolean
      hideParentFolder: boolean
    }
  ): Promise<{ exportedData: string; fileName: string; mimeType: string }> => {
    let exportedData: string

    switch (format) {
      case "html": {
        exportedData = await exportToHTML(
          config.selectedBookmarks,
          config.includeIconData,
          config.includeDateAdded,
          config.includeDateLastUsed,
          config.includeDateGroupModified,
          config.hideOtherBookmarks,
          config.hideParentFolder
        )
        return {
          exportedData,
          fileName: chrome.i18n.getMessage("exportFileNameHTML"),
          mimeType: "text/html"
        }
      }
      case "json": {
        const jsonData = await exportToJSON(
          config.selectedBookmarks,
          config.includeIconData,
          config.includeDateAdded,
          config.includeDateLastUsed,
          config.includeDateGroupModified,
          config.hideOtherBookmarks,
          config.hideParentFolder
        )
        exportedData = JSON.stringify(jsonData, null, 2)
        return {
          exportedData,
          fileName: chrome.i18n.getMessage("exportFileNameJSON"),
          mimeType: "application/json"
        }
      }
      case "csv": {
        exportedData = await exportToCSV(
          config.selectedBookmarks,
          config.includeIconData,
          config.includeDateAdded,
          config.includeDateLastUsed,
          config.includeDateGroupModified
        )
        return {
          exportedData,
          fileName: chrome.i18n.getMessage("exportFileNameCSV"),
          mimeType: "text/csv"
        }
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
    <ThemeProvider storageKey="vite-ui-theme">
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
    </ThemeProvider>
  )
}
