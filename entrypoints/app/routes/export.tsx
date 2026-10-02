import { i18n } from '#i18n'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { BookmarkTree } from '@/components/advanced-export/bookmark-tree'
import { ExportOptionsPanel } from '@/components/export-options-panel'
import { ExportBar } from '@/components/export/export-bar'
import { ExportToolbar } from '@/components/export/export-toolbar'
import {
  ExportTreeEmpty,
  ExportTreeSkeleton,
} from '@/components/export/export-tree-states'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toast'
import { APP_ROUTES } from '@/lib/app-url'
import { exportBookmarks } from '@/lib/export-all-bookmarks'
import { lastExportFormatStore } from '@/lib/storage'
import type { BookmarkTreeHandle, CheckedState } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

/**
 * Focuses the given input when the user presses "/" outside any text field.
 * @param inputReference Ref to the input that should receive focus.
 */
function useSlashToFocus(inputReference: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey
      if (hasModifier || event.key !== '/' || isTypingTarget(event.target)) {
        return
      }
      event.preventDefault()
      inputReference.current?.focus()
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [inputReference])
}

function getMasterState(selected: number, total: number): CheckedState {
  return (
    selected !== 0 && total !== 0 && (selected === total || 'indeterminate')
  )
}

/**
 * The Export screen: a searchable, selectable bookmark tree with a sticky
 * export bar, next to the Export options panel (stacked below it under `lg`).
 * The search term lives in the `q` router search param, so it survives a
 * reload and is shareable through the URL.
 * @returns The Export view.
 */
export function ExportRoute() {
  const treeReference = useRef<BookmarkTreeHandle>(null)
  const searchInputReference = useRef<HTMLInputElement>(null)
  const { q: searchTerm = '' } = useSearch({ from: APP_ROUTES.export })
  const navigate = useNavigate({ from: APP_ROUTES.export })
  const [selectedCount, setSelectedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useStorageItem(lastExportFormatStore)

  useSlashToFocus(searchInputReference)

  const setSearchTerm = (value: string) => {
    void navigate({
      search: { q: value === '' ? undefined : value },
      replace: true,
    })
  }

  const handleMasterChange = () => {
    if (selectedCount === totalCount) treeReference.current?.deselectAll()
    else treeReference.current?.selectAll()
  }

  const handleExport = async () => {
    const tree = treeReference.current
    if (!tree) return

    setIsExporting(true)
    try {
      const selected = await tree.getSelectedBookmarks()
      const { fileName, count } = await exportBookmarks(format, selected)
      toast.add({
        type: 'success',
        title: i18n.t('exportPage_successTitle', [count.toString()]),
        description: fileName,
      })
    } catch (error) {
      toast.add({
        type: 'error',
        title: i18n.t('exportPage_failedTitle'),
        description: (error as Error).message,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-medium">
          {i18n.t('exportPage_title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {i18n.t('exportPage_description')}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-1 flex-col rounded-lg border">
          <ExportToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchInputReference={searchInputReference}
            masterChecked={getMasterState(selectedCount, totalCount)}
            onMasterChange={handleMasterChange}
            onExpandAll={() => treeReference.current?.expandAll()}
            onCollapseAll={() => treeReference.current?.collapseAll()}
          />
          <ScrollArea className="h-128">
            <BookmarkTree
              ref={treeReference}
              searchTerm={searchTerm}
              onSelectionChange={setSelectedCount}
              onTotalChange={setTotalCount}
              className="overflow-visible"
              loadingState={<ExportTreeSkeleton />}
              emptyState={
                <ExportTreeEmpty
                  searchTerm={searchTerm}
                  onClearSearch={() => setSearchTerm('')}
                />
              }
            />
          </ScrollArea>
        </section>

        <ExportOptionsPanel />
      </div>

      <ExportBar
        selectedCount={selectedCount}
        totalCount={totalCount}
        format={format}
        onFormatChange={(next) => void setFormat(next)}
        isExporting={isExporting}
        onExport={() => void handleExport()}
      />
    </div>
  )
}
