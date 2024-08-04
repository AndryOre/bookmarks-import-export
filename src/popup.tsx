import { useState } from "react"

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

function IndexPopup() {
  const [activeTab, setActiveTab] = useState("export")

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-p-3 plasmo-w-60 plasmo-h-56">
      <h1 className="plasmo-text-base plasmo-font-bold plasmo-mb-2 plasmo-text-center">
        Bookmark Import/Export
      </h1>

      <Tabs
        defaultValue="export"
        className="plasmo-flex-grow plasmo-flex plasmo-flex-col">
        <TabsList className="plasmo-grid plasmo-w-full plasmo-grid-cols-2">
          <TabsTrigger value="export" onClick={() => setActiveTab("export")}>
            Export
          </TabsTrigger>
          <TabsTrigger value="import" onClick={() => setActiveTab("import")}>
            Import
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="export"
          className={`plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-flex-grow ${activeTab === "export" ? "" : "plasmo-hidden"}`}>
          <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-gap-2 plasmo-w-full">
            <ExportToHTMLButton className="plasmo-w-full" />
            <ExportToJSONButton className="plasmo-w-full" />
          </div>
          <AdvancedExportButton className="plasmo-w-full" />
        </TabsContent>
        <TabsContent
          value="import"
          className={`plasmo-flex plasmo-justify-center plasmo-flex-grow ${activeTab === "import" ? "" : "plasmo-hidden"}`}>
          <ImportBookmarksButton className="plasmo-w-full" />
        </TabsContent>
      </Tabs>

      <p className="plasmo-mt-2 plasmo-text-xs plasmo-text-center plasmo-text-gray-500">
        Import or export your bookmarks easily
      </p>
    </div>
  )
}

export default IndexPopup
