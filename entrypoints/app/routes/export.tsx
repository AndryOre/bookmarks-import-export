import { i18n } from '#i18n'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { ExportOptionsPanel } from '@/components/export-options-panel'
import { BookmarkTree } from '@/components/export/bookmark-tree'
import { ExportBar } from '@/components/export/export-bar'
import { ExportToolbar } from '@/components/export/export-toolbar'
import {
  ExportTreeEmpty,
  ExportTreeError,
  ExportTreeNoBookmarks,
  ExportTreeSkeleton,
} from '@/components/export/export-tree-states'
import { OperationProgressCard } from '@/components/operation-progress-card'
import { toast } from '@/components/ui/toast'
import { APP_ROUTES } from '@/lib/app-url'
import { exportBookmarks } from '@/lib/export-all-bookmarks'
import { ExportCanceledError } from '@/lib/export-control'
import { formatCount } from '@/lib/format-count'
import { lastExportFormatStore } from '@/lib/storage'
import type { BookmarkTreeHandle, CheckedState } from '@/lib/types'
import { useOperationProgress } from '@/lib/use-operation-progress'
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
  const progress = useOperationProgress()
  const [format, setFormat] = useStorageItem(lastExportFormatStore)

  useSlashToFocus(searchInputReference)

  const setSearchTerm = (value: string) => {
    void navigate({
      search: { q: value === '' ? undefined : value },
      replace: true,
    })
  }

  const handleMasterChange = () => {
    const tree = treeReference.current
    if (!tree) return
    if (tree.areAllVisibleSelected()) tree.deselectAll()
    else tree.selectAll()
  }

  const handleExport = async () => {
    const tree = treeReference.current
    if (!tree) return

    setIsExporting(true)
    const signal = progress.begin()
    try {
      const selected = await tree.getSelectedBookmarks()
      if (selected.length === 0) {
        toast.add({
          type: 'error',
          title: i18n.t('exportPage_failedTitle'),
          description: i18n.t('exportSelectionGone'),
        })
        return
      }
      const { fileName, count } = await exportBookmarks(format, selected, {
        signal,
        onProgress: progress.report,
      })
      toast.add({
        type: 'success',
        title: i18n.t('exportPage_successTitle', count, [formatCount(count)]),
        description: fileName,
      })
    } catch (error) {
      toast.add(
        error instanceof ExportCanceledError
          ? {
              title: i18n.t('progress_exportCanceledTitle'),
              description: i18n.t('progress_exportCanceledDescription'),
            }
          : {
              type: 'error',
              title: i18n.t('exportPage_failedTitle'),
              description: (error as Error).message,
            },
      )
    } finally {
      progress.end()
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
          <div className="flex h-128 flex-col">
            <BookmarkTree
              ref={treeReference}
              searchTerm={searchTerm}
              onSelectionChange={setSelectedCount}
              onTotalChange={setTotalCount}
              loadingState={<ExportTreeSkeleton />}
              noBookmarksState={<ExportTreeNoBookmarks />}
              errorState={(retry) => <ExportTreeError onRetry={retry} />}
              emptyState={
                <ExportTreeEmpty
                  searchTerm={searchTerm}
                  onClearSearch={() => setSearchTerm('')}
                />
              }
            />
          </div>
        </section>

        <ExportOptionsPanel />
      </div>

      {progress.state.isCardVisible && (
        <OperationProgressCard
          kind="export"
          state={progress.state}
          onCancel={progress.requestCancel}
        />
      )}

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
