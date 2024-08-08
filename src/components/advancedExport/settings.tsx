import { InfoIcon } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "~components"

/**
 * Props for the SettingsDialog component
 */
interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Type for settings keys
 */
type SettingKey =
  | "autoExpandFolders"
  | "showBookmarkIcon"
  | "includeIconData"
  | "includeDates"
  | "hideOtherBookmarks"
  | "hideParentFolder"

const settingsChangedEvent = new Event("settingsChanged")

/**
 * SettingsDialog component for managing user preferences
 * @param {SettingsDialogProps} props - The component props
 * @returns {JSX.Element} The rendered SettingsDialog component
 */
export function SettingsDialog({
  isOpen,
  onClose
}: SettingsDialogProps): JSX.Element {
  const [settings, setSettings] = useState({
    showBookmarkIcon: true,
    autoExpandFolders: false,
    includeIconData: false,
    includeDates: true,
    hideOtherBookmarks: true,
    hideParentFolder: false
  })

  /**
   * Load settings from localStorage
   */
  useEffect(() => {
    const loadSetting = (key: SettingKey) => {
      const loadedValue = localStorage.getItem(key)
      if (loadedValue !== null) {
        setSettings((prev) => ({ ...prev, [key]: JSON.parse(loadedValue) }))
      }
    }

    Object.keys(settings).forEach((key) => loadSetting(key as SettingKey))
  }, [])

  /**
   * Save settings to localStorage and dispatch event
   */
  useEffect(() => {
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value))
    })
    window.dispatchEvent(settingsChangedEvent)
  }, [settings])

  /**
   * Handle setting change
   * @param {SettingKey} key - The setting key to update
   * @param {boolean} value - The new value for the setting
   */
  const handleSettingChange = (key: SettingKey, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Render a setting switch with label and optional tooltip
   * @param {SettingKey} settingKey - The key of the setting
   * @param {string} label - The label for the setting
   * @param {string} description - The description of the setting
   * @param {string} [tooltipContent] - Optional tooltip content
   * @returns {JSX.Element} The rendered setting switch
   */
  const renderSettingSwitch = (
    settingKey: SettingKey,
    label: string,
    description: string,
    tooltipContent?: string
  ) => (
    <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
      <div className="plasmo-gap-0.5 plasmo-flex plasmo-flex-col">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <Label htmlFor={settingKey} className="plasmo-text-base">
            {label}
          </Label>
          {tooltipContent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="plasmo-h-4 plasmo-w-4 plasmo-text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>{tooltipContent}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="plasmo-text-sm plasmo-text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        id={settingKey}
        checked={settings[settingKey]}
        onCheckedChange={(checked) => handleSettingChange(settingKey, checked)}
      />
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your bookmark import/export experience.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="display">
          <TabsList className="plasmo-grid plasmo-w-full plasmo-grid-cols-2">
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          <TabsContent
            value="display"
            className="plasmo-gap-4 plasmo-flex plasmo-flex-col">
            {renderSettingSwitch(
              "showBookmarkIcon",
              "Show bookmark icon",
              "Display icons next to bookmarks"
            )}
            <Separator />
            {renderSettingSwitch(
              "autoExpandFolders",
              "Auto-expand folders on load",
              "Expand all folders when bookmarks are initially loaded",
              "Note: May impact performance with large numbers of bookmarks"
            )}
          </TabsContent>
          <TabsContent
            value="export"
            className="plasmo-gap-4 plasmo-flex plasmo-flex-col">
            {renderSettingSwitch(
              "includeIconData",
              "Include icon data",
              "Add website favicon data to the exported file",
              "Note: Increases export time and file size significantly"
            )}
            <Separator />
            {renderSettingSwitch(
              "includeDates",
              "Include dates",
              "Add creation and modification dates to the exported file"
            )}
            <Separator />
            {renderSettingSwitch(
              "hideOtherBookmarks",
              "Hide 'Other bookmarks' folder",
              "Exclude the root 'Other bookmarks' folder from the export",
              "Note: Matches browser's native export behavior, placing 'Other bookmarks' content at the same level as 'Bookmarks bar'"
            )}
            <Separator />
            {renderSettingSwitch(
              "hideParentFolder",
              "Hide parent folder",
              "Exclude parent folders from the exported file",
              "Note: Places all bookmarks directly under root folders like 'Bookmarks bar' and 'Other bookmarks'"
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
