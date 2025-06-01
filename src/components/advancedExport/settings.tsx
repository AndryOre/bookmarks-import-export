import { Database, Eye, FolderTree, InfoIcon, RotateCcw, X } from "lucide-react"

import { useStorage } from "@plasmohq/storage/hook"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

/**
 * SettingsDialog component for managing user preferences
 * @param {SettingsDialogProps} props - The component props
 * @returns {JSX.Element} The rendered SettingsDialog component
 */
export function SettingsDialog({
  isOpen,
  onClose
}: SettingsDialogProps): JSX.Element {
  const [showBookmarkIcon, setShowBookmarkIcon] = useStorage(
    "showBookmarkIcon",
    true
  )
  const [autoExpandFolders, setAutoExpandFolders] = useStorage(
    "autoExpandFolders",
    false
  )
  const [includeIconData, setIncludeIconData] = useStorage(
    "includeIconData",
    true
  )
  const [includeDateAdded, setIncludeDateAdded] = useStorage(
    "includeDateAdded",
    true
  )
  const [includeDateLastUsed, setIncludeDateLastUsed] = useStorage(
    "includeDateLastUsed",
    false
  )
  const [includeDateGroupModified, setIncludeDateGroupModified] = useStorage(
    "includeDateGroupModified",
    true
  )
  const [hideOtherBookmarks, setHideOtherBookmarks] = useStorage(
    "hideOtherBookmarks",
    true
  )
  const [hideParentFolder, setHideParentFolder] = useStorage(
    "hideParentFolder",
    false
  )

  /**
   * Handle setting change
   * @param {SettingKey} key - The setting key to update
   * @param {boolean} value - The new value for the setting
   */
  const handleSettingChange = (key: SettingKey, value: boolean) => {
    switch (key) {
      case "showBookmarkIcon":
        setShowBookmarkIcon(value)
        break
      case "autoExpandFolders":
        setAutoExpandFolders(value)
        break
      case "includeIconData":
        setIncludeIconData(value)
        break
      case "includeDateAdded":
        setIncludeDateAdded(value)
        break
      case "includeDateLastUsed":
        setIncludeDateLastUsed(value)
        break
      case "includeDateGroupModified":
        setIncludeDateGroupModified(value)
        break
      case "hideOtherBookmarks":
        setHideOtherBookmarks(value)
        break
      case "hideParentFolder":
        setHideParentFolder(value)
        break
    }
  }

  /**
   * Reset all settings to their default values
   */
  const resetToDefaults = () => {
    setShowBookmarkIcon(true)
    setAutoExpandFolders(false)
    setIncludeIconData(true)
    setIncludeDateAdded(true)
    setIncludeDateLastUsed(false)
    setIncludeDateGroupModified(true)
    setHideOtherBookmarks(true)
    setHideParentFolder(false)
  }

  /**
   * Get setting value
   * @param {SettingKey} key - The setting key to get
   */
  const getSettingValue = (key: SettingKey): boolean => {
    switch (key) {
      case "showBookmarkIcon":
        return showBookmarkIcon
      case "autoExpandFolders":
        return autoExpandFolders
      case "includeIconData":
        return includeIconData
      case "includeDateAdded":
        return includeDateAdded
      case "includeDateLastUsed":
        return includeDateLastUsed
      case "includeDateGroupModified":
        return includeDateGroupModified
      case "hideOtherBookmarks":
        return hideOtherBookmarks
      case "hideParentFolder":
        return hideParentFolder
      default:
        return false
    }
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
        checked={getSettingValue(settingKey)}
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
          <TabsList className="plasmo-grid plasmo-w-full plasmo-grid-cols-3">
            <TabsTrigger
              value="display"
              className="plasmo-flex plasmo-items-center plasmo-gap-2">
              <Eye className="plasmo-h-4 plasmo-w-4" />
              {chrome.i18n.getMessage("display")}
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="plasmo-flex plasmo-items-center plasmo-gap-2">
              <Database className="plasmo-h-4 plasmo-w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger
              value="structure"
              className="plasmo-flex plasmo-items-center plasmo-gap-2">
              <FolderTree className="plasmo-h-4 plasmo-w-4" />
              Structure
            </TabsTrigger>
          </TabsList>
          <TabsContent value="display" className="plasmo-space-y-4">
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
          <TabsContent value="data" className="plasmo-space-y-4">
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
          </TabsContent>
          <TabsContent value="structure" className="plasmo-space-y-4">
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
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={resetToDefaults}
            className="plasmo-flex plasmo-items-center plasmo-gap-2">
            <RotateCcw className="plasmo-h-4 plasmo-w-4" />
            Reset to defaults
          </Button>
          <Button
            onClick={onClose}
            className="plasmo-flex plasmo-items-center plasmo-gap-2">
            <X className="plasmo-h-4 plasmo-w-4" />
            {chrome.i18n.getMessage("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
