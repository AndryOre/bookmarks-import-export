import { i18n } from '#i18n'
import { useState } from 'react'

import { AdvancedExportButton } from '@/components/advanced-export-button'
import { AdvancedImportButton } from '@/components/advanced-import-button'
import { ExportFormatSelector } from '@/components/export-format-selector'
import { ImportBookmarksButton } from '@/components/import-bookmarks-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { formatFilenameTemplate } from '@/lib/filename-template'
import {
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
} from '@/lib/storage'
import type { BookmarkFormat } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

export default function App() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')

  const [includeIconData] = useStorageItem(includeIconDataStore)
  const [includeDateAdded] = useStorageItem(includeDateAddedStore)
  const [includeDateLastUsed] = useStorageItem(includeDateLastUsedStore)
  const [includeDateGroupModified] = useStorageItem(
    includeDateGroupModifiedStore,
  )
  const [hideOtherBookmarks] = useStorageItem(hideOtherBookmarksStore)
  const [hideParentFolder] = useStorageItem(hideParentFolderStore)
  const [filenameTemplate] = useStorageItem(exportFilenameTemplateStore)

  const handleExport = async (format: BookmarkFormat) => {
    try {
      let content: string
      let mimeType: string
      let fileName: string

      const baseOptions = {
        selectedBookmarks: null,
        includeIconData,
        includeDateAdded,
        includeDateLastUsed,
        includeDateGroupModified,
        hideOtherBookmarks,
        hideParentFolder,
      }

      const baseName = formatFilenameTemplate(filenameTemplate)

      switch (format) {
        case 'html': {
          content = await exportToHTML(baseOptions)
          mimeType = 'text/html'
          fileName = `${baseName}.html`
          break
        }
        case 'json': {
          const data = await exportToJSON(baseOptions)
          content = JSON.stringify(data, null, 2)
          mimeType = 'application/json'
          fileName = `${baseName}.json`
          break
        }
        case 'csv': {
          content = await exportToCSV({
            selectedBookmarks: null,
            includeIconData,
            includeDateAdded,
            includeDateLastUsed,
            hideParentFolder,
          })
          mimeType = 'text/csv'
          fileName = `${baseName}.csv`
          break
        }
        default:
          return
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  return (
    <div className="flex h-64 w-60 flex-col p-3">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'export' | 'import')}
        className="flex flex-1 flex-col"
      >
        <TabsList className="w-full">
          <TabsTrigger value="export" className="flex-1">
            {i18n.t('exportBookmarks')}
          </TabsTrigger>
          <TabsTrigger value="import" className="flex-1">
            {i18n.t('importBookmarks')}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="export"
          className="mt-2 flex flex-1 flex-col gap-2 data-[state=inactive]:hidden"
          forceMount
        >
          <ExportFormatSelector onExport={handleExport} />
          <AdvancedExportButton />
        </TabsContent>

        <TabsContent
          value="import"
          className="mt-2 flex flex-1 flex-col gap-2 data-[state=inactive]:hidden"
          forceMount
        >
          <ImportBookmarksButton />
          <AdvancedImportButton />
        </TabsContent>
      </Tabs>
    </div>
  )
}
