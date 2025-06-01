import logo from "data-base64:assets/icon.png"
import { CheckSquare, RefreshCw, Settings, Square } from "lucide-react"
import { useState } from "react"

import { type HeaderProps } from "~common/types"
import { Button, SearchBar, SettingsDialog } from "~components"
import { ExportFormatSelector } from "~components/exportFormatSelector"

/**
 * Header component for the advanced export page
 * @param {HeaderProps} props - The component props
 * @returns {JSX.Element} The rendered Header component
 */
export function Header({
  searchTerm,
  onSearchChange,
  onRefresh,
  onSelectAll,
  onDeselectAll,
  selectedCount,
  totalCount,
  onExport
}: HeaderProps): JSX.Element {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  /**
   * Handle the refresh action
   * Sets a temporary refreshing state and calls the onRefresh callback
   */
  const handleRefresh = () => {
    setIsRefreshing(true)
    onRefresh()
    onDeselectAll()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  /**
   * Render the logo and title section
   * @returns {JSX.Element} The logo and title JSX
   */
  const renderLogoAndTitle = () => (
    <div className="plasmo-flex plasmo-items-center plasmo-gap-3">
      <img
        src={logo}
        alt={chrome.i18n.getMessage("extensionLogoAlt")}
        className="plasmo-w-11 plasmo-h-11"
      />
      <div className="plasmo-flex plasmo-flex-col">
        <h1 className="plasmo-text-xl plasmo-font-bold plasmo-leading-tight">
          {chrome.i18n.getMessage("extensionName")}
        </h1>
        <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-text-muted-foreground">
          {chrome.i18n.getMessage("advancedDescription")}
        </h2>
      </div>
    </div>
  )

  /**
   * Render the action buttons section
   * @returns {JSX.Element} The action buttons JSX
   */
  const renderActionButtons = () => (
    <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
      <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
        <Settings /> {chrome.i18n.getMessage("settings")}
      </Button>
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ExportFormatSelector onExport={onExport} />
    </div>
  )

  /**
   * Render the search and control section
   * @returns {JSX.Element} The search and control JSX
   */
  const renderSearchAndControls = () => (
    <div className="plasmo-flex plasmo-items-center plasmo-gap-3">
      <SearchBar searchTerm={searchTerm} onSearchChange={onSearchChange} />
      <Button
        variant="outline"
        size="icon"
        onClick={handleRefresh}
        title={chrome.i18n.getMessage("refresh")}
        disabled={isRefreshing}>
        <RefreshCw className={`${isRefreshing ? "plasmo-animate-spin" : ""}`} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onSelectAll}
        title={chrome.i18n.getMessage("selectAll")}>
        <CheckSquare />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onDeselectAll}
        title={chrome.i18n.getMessage("deselectAll")}>
        <Square />
      </Button>
      <span className="plasmo-text-sm plasmo-text-muted-foreground">
        {selectedCount} / {totalCount} {chrome.i18n.getMessage("selected")}
      </span>
    </div>
  )

  return (
    <header className="plasmo-flex plasmo-flex-col plasmo-gap-4 plasmo-py-4 plasmo-px-6 plasmo-border-b plasmo-border">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
        {renderLogoAndTitle()}
        {renderActionButtons()}
      </div>
      {renderSearchAndControls()}
    </header>
  )
}
