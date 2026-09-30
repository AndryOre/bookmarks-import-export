import { i18n } from '#i18n'
import { RefreshCw, Settings } from 'lucide-react'
import { useState } from 'react'

import { ExportFormatSelector } from '@/components/export-format-selector'
import { Button } from '@/components/ui/button'
import type { HeaderProperties, SettingsTab } from '@/lib/types'

import { SearchBar } from './search-bar'
import { SettingsDialog } from './settings-dialog'

/**
 * Whether the page was opened via the
 * `advanced-export.html?settings=auto-export` deep link (the popup footer
 * and the 1.6.0 changelog link both point at it). Read once per page load —
 * the query string doesn't change while the page stays open.
 * @returns `true` when `settings=auto-export` is present in the URL.
 */
function isAutoExportDeepLink(): boolean {
  return (
    new URLSearchParams(globalThis.location.search).get('settings') ===
    'auto-export'
  )
}

export function Header({
  selectedCount,
  totalCount,
  searchTerm,
  onSearchChange,
  onRefresh,
  onSelectAll,
  onDeselectAll,
  onExport,
}: HeaderProperties) {
  const [settingsOpen, setSettingsOpen] = useState(isAutoExportDeepLink)
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<SettingsTab>(
    () => (isAutoExportDeepLink() ? 'auto-export' : 'display'),
  )
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSettingsOpenChange = (isOpen: boolean) => {
    setSettingsOpen(isOpen)
    if (!isOpen) setSettingsDefaultTab('display')
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    onRefresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <header className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2">
      <div className="flex shrink-0 items-center gap-2">
        <img
          src={browser.runtime.getURL('/icons/48.png')}
          alt=""
          className="size-6"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold">{i18n.t('extensionName')}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label={i18n.t('settings')}
        >
          <Settings className="size-4" />
        </Button>

        <ExportFormatSelector onExport={onExport} />
      </div>

      <div className="flex items-center gap-2">
        <SearchBar value={searchTerm} onChange={onSearchChange} />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label={i18n.t('refresh')}
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>

        <Button variant="outline" size="sm" onClick={onSelectAll}>
          {i18n.t('selectAll')}
        </Button>

        <Button variant="outline" size="sm" onClick={onDeselectAll}>
          {i18n.t('deselectAll')}
        </Button>

        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {selectedCount} / {totalCount}
        </span>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={handleSettingsOpenChange}
        defaultTab={settingsDefaultTab}
      />
    </header>
  )
}
