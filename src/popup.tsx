import React, { useCallback, useState } from "react"

import { exportToCSV, exportToHTML, exportToJSON } from "~common/lib"
import {
  AdvancedExportButton,
  AutoExportButton,
  ImportBookmarksButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ThemeProvider
} from "~components"
import {
  ExportFormatSelector,
  type ExportFormat
} from "~components/exportFormatSelector"

import "~style.css"

/**
 * TabValue type for the active tab state
 */
type TabValue = "export" | "import"

/**
 * IndexPopup component that serves as the main popup for the extension
 * @returns {JSX.Element} The rendered IndexPopup component
 */
function IndexPopup(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabValue>("export")

  /**
   * Handles export functionality
   */
  const handleExport = async (format: ExportFormat) => {
    try {
      let content: string
      let mimeType: string
      let fileName: string

      const now = new Date()
      const timestamp = `${now.toISOString().split("T")[0]} ${now.toTimeString().split(" ")[0].replace(/:/g, "-")}`
      const baseName = chrome.i18n.getMessage("exportFileName")

      switch (format) {
        case "html":
          content = await exportToHTML()
          mimeType = "text/html"
          fileName = `${baseName} - ${timestamp}.html`
          break
        case "json":
          const jsonData = await exportToJSON()
          content = JSON.stringify(jsonData, null, 2)
          mimeType = "application/json"
          fileName = `${baseName} - ${timestamp}.json`
          break
        case "csv":
          content = await exportToCSV()
          mimeType = "text/csv"
          fileName = `${baseName} - ${timestamp}.csv`
          break
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.click()
    } catch (error) {
      console.error(chrome.i18n.getMessage("exportError"), error)
    }
  }

  /**
   * Handles tab change
   * @param {TabValue} value - The new tab value
   */
  const handleTabChange = useCallback((value: TabValue) => {
    setActiveTab(value)
  }, [])

  /**
   * Renders the export tab content
   * @returns {JSX.Element} The rendered export tab content
   */
  const renderExportTab = useCallback(
    () => (
      <TabsContent
        value="export"
        className={`plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-flex-grow ${
          activeTab === "export" ? "" : "plasmo-hidden"
        }`}>
        <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-gap-2 plasmo-w-full">
          <ExportFormatSelector onExport={handleExport} />
        </div>
        <div className="plasmo-flex plasmo-flex-col plasmo-w-full">
          <AdvancedExportButton className="plasmo-w-full" />
          <AutoExportButton className="plasmo-w-full" />
        </div>
      </TabsContent>
    ),
    [activeTab, handleExport]
  )

  /**
   * Renders the import tab content
   * @returns {JSX.Element} The rendered import tab content
   */
  const renderImportTab = useCallback(
    () => (
      <TabsContent
        value="import"
        className={`plasmo-flex plasmo-justify-center plasmo-flex-grow ${
          activeTab === "import" ? "" : "plasmo-hidden"
        }`}>
        <ImportBookmarksButton className="plasmo-w-full" />
      </TabsContent>
    ),
    [activeTab]
  )

  return (
    <ThemeProvider storageKey="vite-ui-theme">
      <div className="plasmo-flex plasmo-flex-col plasmo-p-3 plasmo-w-60 plasmo-h-64 plasmo-rounded">
        <h1 className="plasmo-text-base plasmo-font-bold plasmo-mb-2 plasmo-text-center">
          {chrome.i18n.getMessage("extensionName")}
        </h1>

        <Tabs
          defaultValue="export"
          className="plasmo-flex-grow plasmo-flex plasmo-flex-col">
          <TabsList className="plasmo-grid plasmo-w-full plasmo-grid-cols-2">
            <TabsTrigger
              value="export"
              onClick={() => handleTabChange("export")}>
              {chrome.i18n.getMessage("export")}
            </TabsTrigger>
            <TabsTrigger
              value="import"
              onClick={() => handleTabChange("import")}>
              {chrome.i18n.getMessage("import")}
            </TabsTrigger>
          </TabsList>
          {renderExportTab()}
          {renderImportTab()}
        </Tabs>

        <p className="plasmo-mt-2 plasmo-text-xs plasmo-text-center plasmo-text-muted-foreground">
          {chrome.i18n.getMessage("extensionDescription")}
        </p>
      </div>
    </ThemeProvider>
  )
}

export default IndexPopup
