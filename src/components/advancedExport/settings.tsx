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
  | "includeDateAdded"
  | "includeDateLastUsed"
  | "includeDateGroupModified"
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
    includeIconData: true,
    includeDateAdded: true,
    includeDateLastUsed: false,
    includeDateGroupModified: true,
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
    label: any,
    description: any,
    tooltipContent?: any
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
          <DialogTitle>{chrome.i18n.getMessage("settings")}</DialogTitle>
          <DialogDescription>
            {chrome.i18n.getMessage("settingsDescription")}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="display">
          <TabsList className="plasmo-grid plasmo-w-full plasmo-grid-cols-2">
            <TabsTrigger value="display">
              {chrome.i18n.getMessage("display")}
            </TabsTrigger>
            <TabsTrigger value="export">
              {chrome.i18n.getMessage("export")}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="display"
            className="plasmo-gap-4 plasmo-flex plasmo-flex-col">
            {renderSettingSwitch(
              "showBookmarkIcon",
              chrome.i18n.getMessage("showBookmarkIcon"),
              chrome.i18n.getMessage("showBookmarkIconDescription")
            )}
            <Separator />
            {renderSettingSwitch(
              "autoExpandFolders",
              chrome.i18n.getMessage("autoExpandFolders"),
              chrome.i18n.getMessage("autoExpandFoldersDescription"),
              chrome.i18n.getMessage("autoExpandFoldersTooltip")
            )}
          </TabsContent>
          <TabsContent
            value="export"
            className="plasmo-gap-4 plasmo-flex plasmo-flex-col">
            {renderSettingSwitch(
              "includeIconData",
              chrome.i18n.getMessage("includeIconData"),
              chrome.i18n.getMessage("includeIconDataDescription"),
              chrome.i18n.getMessage("includeIconDataTooltip")
            )}
            <Separator />
            {renderSettingSwitch(
              "includeDateAdded",
              chrome.i18n.getMessage("includeDateAdded"),
              chrome.i18n.getMessage("includeDateAddedDescription")
            )}
            <Separator />
            {renderSettingSwitch(
              "includeDateLastUsed",
              chrome.i18n.getMessage("includeDateLastUsed"),
              chrome.i18n.getMessage("includeDateLastUsedDescription")
            )}
            <Separator />
            {renderSettingSwitch(
              "includeDateGroupModified",
              chrome.i18n.getMessage("includeDateGroupModified"),
              chrome.i18n.getMessage("includeDateGroupModifiedDescription"),
              chrome.i18n.getMessage("includeDateGroupModifiedTooltip")
            )}
            <Separator />
            {renderSettingSwitch(
              "hideOtherBookmarks",
              chrome.i18n.getMessage("hideOtherBookmarks"),
              chrome.i18n.getMessage("hideOtherBookmarksDescription"),
              chrome.i18n.getMessage("hideOtherBookmarksTooltip")
            )}
            <Separator />
            {renderSettingSwitch(
              "hideParentFolder",
              chrome.i18n.getMessage("hideParentFolder"),
              chrome.i18n.getMessage("hideParentFolderDescription"),
              chrome.i18n.getMessage("hideParentFolderTooltip")
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
