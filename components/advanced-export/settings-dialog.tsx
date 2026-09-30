import { i18n } from '#i18n'
import { Download, Folder, Info, Loader2, Save } from 'lucide-react'
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
import {
  readAutoExportLastRun,
  RUN_MANUAL_EXPORT_MESSAGE_TYPE,
  type RunManualExportMessage,
  type RunManualExportResponse,
} from '@/lib/auto-export'
import { formatFilenameTemplate } from '@/lib/filename-template'
import {
  autoExpandFoldersStore,
  autoExportConfigStore,
  autoExportNextRunStore,
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
import type {
  AutoExportConfig,
  AutoExportFormat,
  AutoExportInterval,
  AutoExportLastRun,
  MessageKey,
  SettingsDialogProperties,
  SettingsTab,
} from '@/lib/types'
import { t } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'
import { cn } from '@/lib/utils'

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

const INTERVALS: {
  value: AutoExportInterval
  labelKey: MessageKey
}[] = [
  { value: '12h', labelKey: 'intervalEvery12Hours' },
  { value: '1d', labelKey: 'intervalEveryDay' },
  { value: '3d', labelKey: 'intervalEvery3Days' },
  { value: '7d', labelKey: 'intervalEvery7Days' },
]

/**
 * Settings dialog for the advanced export flow, split into Display, Export
 * and Auto-export tabs.
 *
 * The Display and Export tabs are backed directly by
 * {@link useStorageItem}, so every change there is persisted immediately.
 * The Auto-export tab is different on purpose: its controls only edit
 * `localConfig`, a local draft, and nothing is written to
 * `autoExportConfigStore` until the user presses Save (`handleSave`) — so a
 * change on that tab has no effect if the dialog is closed without saving.
 * @param root0 This component's properties.
 * @param root0.open Whether the dialog is open.
 * @param root0.onOpenChange Called when the dialog's open state should change.
 * @param root0.defaultTab Which tab is active; defaults to `'display'`.
 * @returns The dialog element, tabbed across Display, Export, and Auto-export.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  defaultTab,
}: SettingsDialogProperties) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    defaultTab ?? 'display',
  )
  const [syncedDefaultTab, setSyncedDefaultTab] = useState(defaultTab)

  /**
   * Resets the active tab whenever `defaultTab` changes underneath us —
   * computed during render instead of an effect, per
   * {@link https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes},
   * matching `syncedFilenameTemplate` below.
   */
  if (defaultTab !== syncedDefaultTab) {
    setSyncedDefaultTab(defaultTab)
    setActiveTab(defaultTab ?? 'display')
  }
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
  const [syncedFilenameTemplate, setSyncedFilenameTemplate] =
    useState(filenameTemplate)

  /**
   * Resets the draft whenever the stored template changes underneath us —
   * computed during render instead of an effect, per
   * {@link https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes}.
   */
  if (filenameTemplate !== syncedFilenameTemplate) {
    setSyncedFilenameTemplate(filenameTemplate)
    setLocalTemplate(filenameTemplate)
  }

  /**
   * Local draft of the auto-export config for the Auto-export tab. Unlike
   * the Display/Export tabs' storage-backed state above, changes here are
   * not persisted until {@link handleSave} runs.
   */
  const [localConfig, setLocalConfig] = useState<AutoExportConfig>(
    DEFAULT_AUTO_EXPORT_CONFIG,
  )
  const [formatError, setFormatError] = useState(false)

  /**
   * The Auto-export tab's status card data — the *persisted* last/next run
   * plus the *persisted* `enabled` flag (unlike `localConfig`, this never
   * reflects unsaved draft edits, since the status card always shows the
   * real, currently-scheduled state).
   */
  const [status, setStatus] = useState<{
    lastRun: AutoExportLastRun | null
    nextRun: number | null
    enabled: boolean
  } | null>(null)

  /**
   * "Export now" button state. Independent of `handleSave`'s persistence —
   * running an export never touches `autoExportConfigStore`.
   */
  const [exportNowState, setExportNowState] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle')
  const [exportNowError, setExportNowError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const loadConfig = async () => {
      const [config, lastRun, nextRun] = await Promise.all([
        autoExportConfigStore.getValue(),
        readAutoExportLastRun(),
        autoExportNextRunStore.getValue(),
      ])
      setLocalConfig(config)
      setFormatError(false)
      setStatus({ lastRun, nextRun, enabled: config.enabled })
      setExportNowState('idle')
      setExportNowError(null)
    }
    void loadConfig()
  }, [open])

  /**
   * Clears a just-shown "Export now" success/error message after a few
   * seconds, so it doesn't linger indefinitely.
   */
  useEffect(() => {
    if (exportNowState !== 'success' && exportNowState !== 'error') return
    const timeout = setTimeout(() => setExportNowState('idle'), 4000)
    return () => clearTimeout(timeout)
  }, [exportNowState])

  const updateConfig = <K extends keyof AutoExportConfig>(
    key: K,
    value: AutoExportConfig[K],
  ) => {
    setLocalConfig((previous) => ({ ...previous, [key]: value }))
  }

  const toggleFormat = (fmt: AutoExportFormat) => {
    setFormatError(false)
    setLocalConfig((previous) => {
      const formats = previous.formats.includes(fmt)
        ? previous.formats.filter((f) => f !== fmt)
        : [...previous.formats, fmt]
      return { ...previous, formats }
    })
  }

  /**
   * Validates and commits the Auto-export tab's draft (`localConfig`) to
   * storage, then closes the dialog. This is the only place that draft is
   * ever persisted — closing the dialog any other way discards it.
   */
  const handleSave = async () => {
    if (localConfig.formats.length === 0) {
      setFormatError(true)
      return
    }
    await autoExportConfigStore.setValue(localConfig)
    onOpenChange(false)
  }

  /**
   * Runs an on-demand export using the on-screen draft's `formats`/`path`
   * (`localConfig`, not what's persisted), regardless of the Enable switch.
   * Sends {@link RunManualExportMessage} to the background service worker,
   * which runs the export with `trigger: 'manual'` and never touches the
   * next-run store or the alarm. Refreshes the status card's last/next-run
   * values from storage once the run settles, so a just-completed manual
   * run shows up immediately without closing the dialog.
   */
  const handleExportNow = async () => {
    if (localConfig.formats.length === 0) {
      setFormatError(true)
      return
    }

    setExportNowState('running')
    setExportNowError(null)

    const message: RunManualExportMessage = {
      type: RUN_MANUAL_EXPORT_MESSAGE_TYPE,
      formats: localConfig.formats,
      path: localConfig.path,
    }

    try {
      const response = (await browser.runtime.sendMessage(message)) as
        RunManualExportResponse | undefined

      if (response?.ok) {
        setExportNowState('success')
      } else {
        setExportNowState('error')
        setExportNowError(response?.error ?? '')
      }
    } catch (error) {
      setExportNowState('error')
      setExportNowError(error instanceof Error ? error.message : String(error))
    }

    const [lastRun, nextRun] = await Promise.all([
      readAutoExportLastRun(),
      autoExportNextRunStore.getValue(),
    ])
    setStatus((previous) =>
      previous ? { ...previous, lastRun, nextRun } : previous,
    )
  }

  const { hour: hour12, minute, period } = parseTo12h(localConfig.preferredTime)

  const updateHour = (value: string) => {
    const h = Math.min(12, Math.max(1, parseInt(value) || 1))
    updateConfig('preferredTime', formatTime(h, minute, period))
  }

  const updateMinute = (value: string) => {
    const m = Math.min(59, Math.max(0, parseInt(value) || 0))
    updateConfig('preferredTime', formatTime(hour12, m, period))
  }

  const updatePeriod = (value: string) => {
    updateConfig(
      'preferredTime',
      formatTime(hour12, minute, value as 'AM' | 'PM'),
    )
  }

  const isShowTimePicker = localConfig.interval !== '12h'

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
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SettingsTab)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="display" className="flex-1">
                {i18n.t('display')}
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1">
                {i18n.t('export')}
              </TabsTrigger>
              <TabsTrigger value="auto-export" className="flex-1">
                {i18n.t('autoExport')}
              </TabsTrigger>
            </TabsList>

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

            <TabsContent value="export" className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>{i18n.t('exportFilenameTemplate')}</Label>
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
                  onChange={(event) => setLocalTemplate(event.target.value)}
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

            <TabsContent value="auto-export" className="pt-2">
              <div
                className="max-h-(--settings-scroll-max) space-y-4 overflow-y-auto pr-0.5"
                style={
                  { '--settings-scroll-max': '55vh' } as React.CSSProperties
                }
              >
                <div className="space-y-2 rounded-md border p-3">
                  <AutoExportStatusRow
                    labelKey="lastAutoExportLabel"
                    dotClassName={
                      status?.lastRun
                        ? status.lastRun.ok
                          ? 'bg-success'
                          : 'bg-destructive'
                        : 'bg-muted-foreground/40'
                    }
                    value={
                      status?.lastRun
                        ? new Date(status.lastRun.at).toLocaleString()
                        : i18n.t('autoExportNeverRun')
                    }
                    errorText={
                      status?.lastRun && !status.lastRun.ok
                        ? status.lastRun.error
                        : undefined
                    }
                  />
                  <AutoExportStatusRow
                    labelKey="nextAutoExportLabel"
                    dotClassName={
                      status?.enabled ? 'bg-success' : 'bg-muted-foreground/40'
                    }
                    value={
                      status?.enabled
                        ? status.nextRun
                          ? new Date(status.nextRun).toLocaleString()
                          : i18n.t('autoExportNeverRun')
                        : i18n.t('autoExportOff')
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-0.5">
                    <Label>{i18n.t('enableAutoExport')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {i18n.t('enableAutoExportDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.enabled}
                    onCheckedChange={(isEnabled) =>
                      updateConfig('enabled', isEnabled)
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{i18n.t('exportInterval')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('selectExportInterval')}
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
                        <span className="font-medium">{t(labelKey)}</span>
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

                <div className="space-y-2">
                  <Label>{i18n.t('preferredExportTime')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('selectPreferredTime')}
                  </p>
                  {isShowTimePicker ? (
                    <div
                      className={cn(
                        'flex items-end gap-2',
                        !localConfig.enabled &&
                          'pointer-events-none opacity-50',
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {i18n.t('hoursLabel')}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={hour12}
                          onChange={(event) => updateHour(event.target.value)}
                          className="h-8 w-16 text-center text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {i18n.t('minutesLabel')}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={String(minute).padStart(2, '0')}
                          onChange={(event) => updateMinute(event.target.value)}
                          className="h-8 w-16 text-center text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {i18n.t('periodLabel')}
                        </Label>
                        <Select value={period} onValueChange={updatePeriod}>
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">
                              {i18n.t('periodAM')}
                            </SelectItem>
                            <SelectItem value="PM">
                              {i18n.t('periodPM')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {i18n.t('timeSelectionUnavailable')}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{i18n.t('exportPath')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('exportPathDescription')}
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
                      onChange={(event) =>
                        updateConfig('path', event.target.value)
                      }
                      placeholder="bookmarks-backup/"
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{i18n.t('autoExportFormats')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {i18n.t('autoExportFormatsDescription')}
                  </p>
                  <div
                    className={cn(
                      'flex gap-2',
                      !localConfig.enabled && 'pointer-events-none opacity-50',
                    )}
                  >
                    {(['html', 'json', 'csv'] as AutoExportFormat[]).map(
                      (fmt) => (
                        /**
                         * A native `<label>` (not the shadcn `Label`
                         * primitive, to avoid nesting `<label>` elements)
                         * makes the whole chip toggle the checkbox without
                         * a manual click handler or extra keyboard/role
                         * wiring.
                         * @returns The format's toggle chip.
                         */
                        <label
                          key={fmt}
                          htmlFor={`fmt-${fmt}`}
                          className={cn(
                            'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                            localConfig.formats.includes(fmt)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-accent',
                          )}
                        >
                          <Checkbox
                            id={`fmt-${fmt}`}
                            checked={localConfig.formats.includes(fmt)}
                            onCheckedChange={() => toggleFormat(fmt)}
                          />
                          <span className="text-sm font-medium uppercase">
                            {fmt.toUpperCase()}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                  {formatError && (
                    <p className="text-xs text-destructive">
                      {i18n.t('formatRequired')}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="size-4" />
                      {i18n.t('saveSettings')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportNow}
                      disabled={exportNowState === 'running'}
                      className="flex-1"
                    >
                      {exportNowState === 'running' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {i18n.t('exportNow')}
                    </Button>
                  </div>
                  {exportNowState === 'success' && (
                    <p className="text-xs text-success">
                      {i18n.t('exportNowSuccess')}
                    </p>
                  )}
                  {exportNowState === 'error' && (
                    <p className="truncate text-xs text-destructive">
                      {i18n.t('exportNowFailed')}
                      {exportNowError ? `: ${exportNowError}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

interface SettingRowProperties {
  labelKey: MessageKey
  descKey: MessageKey
  tooltipKey?: MessageKey
  checked: boolean
  onCheckedChange: (isChecked: boolean) => Promise<void>
}

function SettingRow({
  labelKey,
  descKey,
  tooltipKey,
  checked,
  onCheckedChange,
}: SettingRowProperties) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1">
          <Label>{t(labelKey)}</Label>
          {tooltipKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{t(tooltipKey)}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t(descKey)}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

interface AutoExportStatusRowProperties {
  labelKey: MessageKey
  dotClassName: string
  value: string
  errorText?: string
}

/**
 * One row of the Auto-export tab's status card (last run / next run): a
 * label, a small colored status dot, and the current value. `errorText`, if
 * given, renders below as a single truncated line — used for the last-run
 * row when the stored run failed.
 * @param root0 This row's properties.
 * @param root0.labelKey The row's label message key.
 * @param root0.dotClassName A Tailwind background-color class for the status dot.
 * @param root0.value The row's current value text.
 * @param root0.errorText An optional error message, rendered as a truncated line below.
 * @returns The status row element.
 */
function AutoExportStatusRow({
  labelKey,
  dotClassName,
  value,
  errorText,
}: AutoExportStatusRowProperties) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
      <div className="flex max-w-2/3 flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className={cn('size-1.5 shrink-0 rounded-full', dotClassName)}
          />
          <span className="text-xs font-medium">{value}</span>
        </div>
        {errorText && (
          <p
            className="max-w-full truncate text-xs text-destructive"
            title={errorText}
          >
            {errorText}
          </p>
        )}
      </div>
    </div>
  )
}
