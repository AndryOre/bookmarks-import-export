import React, { useCallback, useState } from "react"

import {
  AdvancedExportButton,
  ExportToHTMLButton,
  ExportToJSONButton,
  ImportBookmarksButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "~components"

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
          <ExportToHTMLButton className="plasmo-w-full" />
          <ExportToJSONButton className="plasmo-w-full" />
        </div>
        <AdvancedExportButton className="plasmo-w-full" />
      </TabsContent>
    ),
    [activeTab]
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
    <div className="plasmo-flex plasmo-flex-col plasmo-p-3 plasmo-w-60 plasmo-h-56 plasmo-bg-neutral-50 plasmo-rounded">
      <h1 className="plasmo-text-base plasmo-font-bold plasmo-mb-2 plasmo-text-center">
        Bookmark Import/Export
      </h1>

      <Tabs
        defaultValue="export"
        className="plasmo-flex-grow plasmo-flex plasmo-flex-col">
        <TabsList className="plasmo-grid plasmo-w-full plasmo-grid-cols-2">
          <TabsTrigger value="export" onClick={() => handleTabChange("export")}>
            Export
          </TabsTrigger>
          <TabsTrigger value="import" onClick={() => handleTabChange("import")}>
            Import
          </TabsTrigger>
        </TabsList>
        {renderExportTab()}
        {renderImportTab()}
      </Tabs>

      <p className="plasmo-mt-2 plasmo-text-xs plasmo-text-center plasmo-text-gray-500">
        Import or export your bookmarks easily
      </p>
    </div>
  )
}

export default IndexPopup
