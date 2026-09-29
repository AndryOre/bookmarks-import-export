import { i18n } from '#i18n'
import { Folder, Info, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatFilenameTemplate } from '@/lib/filename-template'
import {
  autoExpandFoldersStore,
  autoExportConfigStore,
  DEFAULT_AUTO_EXPORT_CONFIG,
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
  showBookmarkIconStore,
} from '@/lib/storage'
import type { SettingsDialogProperties } from '@/lib/types'
import type {
  AutoExportConfig,
  AutoExportFormat,
  AutoExportInterval,
} from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'
import { cn } from '@/lib/utils'

// ─── Time helpers ────────────────────────────────────────────────────────────

function parseTo12h(time: string): {
  hour: number
  minute: number
  period: 'AM' | 'PM'
} {
  const [hRaw, mRaw] = time.split(':').map(Number)
  const h = hRaw ?? 0
  const m = mRaw ?? 0
  return {
    hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
    minute: m,
    period: h < 12 ? 'AM' : 'PM',
  }
}

function formatTime(
  hour12: number,
  minute: number,
  period: 'AM' | 'PM',
): string {
  let h = hour12
  if (period === 'AM' && hour12 === 12) h = 0
  else if (period === 'PM' && hour12 !== 12) h = hour12 + 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ─── Interval options ─────────────────────────────────────────────────────────

const INTERVALS: { value: AutoExportInterval; labelKey: string }[] = [
  { value: '12h', labelKey: 'intervalEvery12Hours' },
  { value: '1d', labelKey: 'intervalEveryDay' },
  { value: '3d', labelKey: 'intervalEvery3Days' },
  { value: '7d', labelKey: 'intervalEvery7Days' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProperties) {
  // ── Display + Export tab stores (immediate save) ───────────────────────────
  const [showBookmarkIcon, setShowBookmarkIcon] = useStorageItem(
    showBookmarkIconStore,
  )
  const [autoExpandFolders, setAutoExpandFolders] = useStorageItem(
    autoExpandFoldersStore,
  )
  const [includeIconData, setIncludeIconData] =
    useStorageItem(includeIconDataStore)
  const [includeDateAdded, setIncludeDateAdded] = useStorageItem(
    includeDateAddedStore,
  )
  const [includeDateLastUsed, setIncludeDateLastUsed] = useStorageItem(
    includeDateLastUsedStore,
  )
  const [includeDateGroupModified, setIncludeDateGroupModified] =
    useStorageItem(includeDateGroupModifiedStore)
  const [hideOtherBookmarks, setHideOtherBookmarks] = useStorageItem(
    hideOtherBookmarksStore,
  )
  const [hideParentFolder, setHideParentFolder] = useStorageItem(
    hideParentFolderStore,
  )
  const [filenameTemplate, setFilenameTemplate] = useStorageItem(
    exportFilenameTemplateStore,
  )
  const [localTemplate, setLocalTemplate] = useState(filenameTemplate)

  useEffect(() => {
    setLocalTemplate(filenameTemplate)
  }, [filenameTemplate])

  // ── Auto-save tab local state (explicit Save button) ───────────────────────
  const [localConfig, setLocalConfig] = useState<AutoExportConfig>(
    DEFAULT_AUTO_EXPORT_CONFIG,
  )
  const [formatError, setFormatError] = useState(false)

  useEffect(() => {
    if (!open) return
    autoExportConfigStore.getValue().then(setLocalConfig)
    setFormatError(false)
  }, [open])

  const updateConfig = <K extends keyof AutoExportConfig>(
    key: K,
    value: AutoExportConfig[K],
  ) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
  }

  const toggleFormat = (fmt: AutoExportFormat) => {
    setFormatError(false)
    setLocalConfig((prev) => {
      const formats = prev.formats.includes(fmt)
        ? prev.formats.filter((f) => f !== fmt)
        : [...prev.formats, fmt]
      return { ...prev, formats }
    })
  }

  const handleSave = async () => {
    if (localConfig.formats.length === 0) {
      setFormatError(true)
      return
    }
    await autoExportConfigStore.setValue(localConfig)
    onOpenChange(false)
  }

  // ── Time picker derived values ─────────────────────────────────────────────
  const { hour: hour12, minute, period } = parseTo12h(localConfig.preferredTime)

  const updateHour = (val: string) => {
    const h = Math.min(12, Math.max(1, parseInt(val) || 1))
    updateConfig('preferredTime', formatTime(h, minute, period))
  }

  const updateMinute = (val: string) => {
    const m = Math.min(59, Math.max(0, parseInt(val) || 0))
    updateConfig('preferredTime', formatTime(hour12, m, period))
  }

  const updatePeriod = (val: string) => {
    updateConfig(
      'preferredTime',
      formatTime(hour12, minute, val as 'AM' | 'PM'),
    )
  }

  const showTimePicker = localConfig.interval !== '12h'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i18n.t('settings')}</DialogTitle>
          <DialogDescription className="sr-only">
            {i18n.t('settingsDescription')}
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <Tabs defaultValue="display">
            <TabsList className="w-full">
              <TabsTrigger value="display" className="flex-1">
                {i18n.t('display')}
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1">
                {i18n.t('export')}
              </TabsTrigger>
              <TabsTrigger value="auto-save" className="flex-1">
                {i18n.t('autoSave' as any)}
              </TabsTrigger>
            </TabsList>

            {/* ── Display tab ───────────────────────────────────────────────── */}
            <TabsContent value="display" className="space-y-4 pt-2">
              <SettingRow
                labelKey="showBookmarkIcon"
                descKey="showBookmarkIconDescription"
                checked={showBookmarkIcon}
                onCheckedChange={setShowBookmarkIcon}
              />
              <SettingRow
                labelKey="autoExpandFolders"
                descKey="autoExpandFoldersDescription"
                tooltipKey="autoExpandFoldersTooltip"
                checked={autoExpandFolders}
                onCheckedChange={setAutoExpandFolders}
              />
            </TabsContent>

            {/* ── Export tab ────────────────────────────────────────────────── */}
            <TabsContent value="export" className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-sm font-medium">
                    {i18n.t('exportFilenameTemplate')}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        {i18n.t('exportFilenameTemplateTooltip')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  {i18n.t('exportFilenameTemplateDescription')}
                </p>
                <Input
                  value={localTemplate}
                  onChange={(e) => setLocalTemplate(e.target.value)}
                  onBlur={() => setFilenameTemplate(localTemplate)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {i18n.t('exportFilenameTemplatePreview')}{' '}
                  <span className="font-mono">
                    {formatFilenameTemplate(localTemplate)}.html
                  </span>
                </p>
              </div>

              <Separator />

              <SettingRow
                labelKey="includeIconData"
                descKey="includeIconDataDescription"
                tooltipKey="includeIconDataTooltip"
                checked={includeIconData}
                onCheckedChange={setIncludeIconData}
              />
              <SettingRow
                labelKey="includeDateAdded"
                descKey="includeDateAddedDescription"
                checked={includeDateAdded}
                onCheckedChange={setIncludeDateAdded}
              />
              <SettingRow
                labelKey="includeDateLastUsed"
                descKey="includeDateLastUsedDescription"
                checked={includeDateLastUsed}
                onCheckedChange={setIncludeDateLastUsed}
              />

              <Separator />

              <SettingRow
                labelKey="includeDateGroupModified"
                descKey="includeDateGroupModifiedDescription"
                tooltipKey="includeDateGroupModifiedTooltip"
                checked={includeDateGroupModified}
                onCheckedChange={setIncludeDateGroupModified}
              />
              <SettingRow
                labelKey="hideOtherBookmarks"
                descKey="hideOtherBookmarksDescription"
                tooltipKey="hideOtherBookmarksTooltip"
                checked={hideOtherBookmarks}
                onCheckedChange={setHideOtherBookmarks}
              />
              <SettingRow
                labelKey="hideParentFolder"
                descKey="hideParentFolderDescription"
                tooltipKey="hideParentFolderTooltip"
                checked={hideParentFolder}
                onCheckedChange={setHideParentFolder}
              />
            </TabsContent>

            {/* ── Auto-save tab ─────────────────────────────────────────────── */}
            <TabsContent value="auto-save" className="pt-2">
              <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-0.5">
                {/* Enable toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-0.5">
                    <Label className="text-sm font-medium">
                      {i18n.t('enableAutoExport' as any)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {i18n.t('enableAutoExportDescription' as any)}
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.enabled}
                    onCheckedChange={(v) => updateConfig('enabled', v)}
                  />
                </div>

                <Separator />

                {/* Export Interval */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {i18n.t('exportInterval' as any)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('selectExportInterval' as any)}
                  </p>
                  <div
                    className={cn(
                      'grid grid-cols-2 gap-2',
                      !localConfig.enabled && 'pointer-events-none opacity-50',
                    )}
                  >
                    {INTERVALS.map(({ value, labelKey }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={localConfig.interval === value}
                        onClick={() => updateConfig('interval', value)}
                        className={cn(
                          'flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors',
                          localConfig.interval === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent',
                        )}
                      >
                        <span className="font-medium">
                          {i18n.t(labelKey as any)}
                        </span>
                        <div
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                            localConfig.interval === value
                              ? 'border-primary'
                              : 'border-muted-foreground/50',
                          )}
                        >
                          {localConfig.interval === value && (
                            <div className="size-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Preferred Export Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {i18n.t('preferredExportTime' as any)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('selectPreferredTime' as any)}
                  </p>
                  {showTimePicker ? (
                    <div
                      className={cn(
                        'flex items-end gap-2',
                        !localConfig.enabled &&
                          'pointer-events-none opacity-50',
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {i18n.t('hoursLabel' as any)}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={hour12}
                          onChange={(e) => updateHour(e.target.value)}
                          className="h-8 w-16 text-center text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {i18n.t('minutesLabel' as any)}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={String(minute).padStart(2, '0')}
                          onChange={(e) => updateMinute(e.target.value)}
                          className="h-8 w-16 text-center text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {i18n.t('periodLabel' as any)}
                        </Label>
                        <Select value={period} onValueChange={updatePeriod}>
                          <SelectTrigger className="h-8 w-20 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {i18n.t('timeSelectionUnavailable' as any)}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Export Path */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {i18n.t('exportPath' as any)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('exportPathDescription' as any)}
                  </p>
                  <div
                    className={cn(
                      'relative',
                      !localConfig.enabled && 'pointer-events-none opacity-50',
                    )}
                  >
                    <Folder className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={localConfig.path}
                      onChange={(e) => updateConfig('path', e.target.value)}
                      placeholder="bookmarks-backup/"
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Export Formats */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {i18n.t('autoExportFormats' as any)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('autoExportFormatsDescription' as any)}
                  </p>
                  <div
                    className={cn(
                      'flex gap-2',
                      !localConfig.enabled && 'pointer-events-none opacity-50',
                    )}
                  >
                    {(['html', 'json', 'csv'] as AutoExportFormat[]).map(
                      (fmt) => (
                        <div
                          key={fmt}
                          className={cn(
                            'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                            localConfig.formats.includes(fmt)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-accent',
                          )}
                          onClick={() => toggleFormat(fmt)}
                        >
                          <Checkbox
                            id={`fmt-${fmt}`}
                            checked={localConfig.formats.includes(fmt)}
                            onCheckedChange={() => toggleFormat(fmt)}
                          />
                          <Label
                            htmlFor={`fmt-${fmt}`}
                            className="cursor-pointer text-sm font-medium uppercase"
                          >
                            {fmt.toUpperCase()}
                          </Label>
                        </div>
                      ),
                    )}
                  </div>
                  {formatError && (
                    <p className="text-xs text-destructive">
                      {i18n.t('formatRequired' as any)}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Save button */}
                <Button onClick={handleSave} className="w-full">
                  <Save className="size-4" />
                  {i18n.t('saveSettings' as any)}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

interface SettingRowProps {
  labelKey: string
  descKey: string
  tooltipKey?: string
  checked: boolean
  onCheckedChange: (value: boolean) => Promise<void>
}

function SettingRow({
  labelKey,
  descKey,
  tooltipKey,
  checked,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1">
          <Label className="text-sm font-medium">
            {i18n.t(labelKey as any)}
          </Label>
          {tooltipKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{i18n.t(tooltipKey as any)}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {i18n.t(descKey as any)}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
