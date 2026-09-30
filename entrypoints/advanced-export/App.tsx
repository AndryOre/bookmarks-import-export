import { i18n } from '#i18n'
import { useRef, useState } from 'react'

import { BookmarkTree } from '@/components/advanced-export/bookmark-tree'
import { Header } from '@/components/advanced-export/header'
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
import type { BookmarkFormat, BookmarkTreeHandle } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

export default function App() {
  const treeReference = useRef<BookmarkTreeHandle>(null)
  const [selectedCount, setSelectedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

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
    const tree = treeReference.current
    if (!tree) return

    const selectedBookmarks = await tree.getSelectedBookmarks()

    if (selectedBookmarks.length === 0) {
      alert(i18n.t('noBookmarksSelected'))
      return
    }

    try {
      let content: string
      let mimeType: string
      let fileName: string

      const baseOptions = {
        selectedBookmarks,
        includeIconData,
        includeDateAdded,
        includeDateLastUsed,
        hideParentFolder,
      }

      const baseName = formatFilenameTemplate(filenameTemplate)

      switch (format) {
        case 'html': {
          content = await exportToHTML({
            ...baseOptions,
            includeDateGroupModified,
            hideOtherBookmarks,
          })
          mimeType = 'text/html'
          fileName = `${baseName}.html`
          break
        }
        case 'json': {
          const data = await exportToJSON({
            ...baseOptions,
            includeDateGroupModified,
            hideOtherBookmarks,
          })
          content = JSON.stringify(data, null, 2)
          mimeType = 'application/json'
          fileName = `${baseName}.json`
          break
        }
        case 'csv': {
          content = await exportToCSV({
            ...baseOptions,
            includeDateLastUsed,
          })
          mimeType = 'text/csv'
          fileName = `${baseName}.csv`
          break
        }
        default: {
          return
        }
      }

      downloadFile(content, mimeType, fileName)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleRefresh = async () => {
    await treeReference.current?.refresh()
  }

  const handleSelectAll = () => {
    treeReference.current?.selectAll()
  }

  const handleDeselectAll = () => {
    treeReference.current?.deselectAll()
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        selectedCount={selectedCount}
        totalCount={totalCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onExport={handleExport}
      />

      <BookmarkTree
        ref={treeReference}
        searchTerm={searchTerm}
        onSelectionChange={setSelectedCount}
        onTotalChange={setTotalCount}
      />
    </div>
  )
}

function downloadFile(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}
