import { i18n } from '#i18n'
import { CircleAlertIcon, CircleCheckIcon, DownloadIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { TimePicker } from '@/components/time-picker'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  readAutoExportLastRun,
  RUN_MANUAL_EXPORT_MESSAGE_TYPE,
  type RunManualExportMessage,
  type RunManualExportResponse,
} from '@/lib/auto-export'
import {
  parseKeepLast,
  resolveFolder,
  resolveFormats,
} from '@/lib/auto-export-form'
import {
  EXPORT_FORMAT_INFO,
  EXPORT_FORMATS,
  type ExportFormat,
} from '@/lib/export-formats'
import { resolveNextRunStatus } from '@/lib/next-run-status'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
  autoExportNotifyOnFailureStore,
} from '@/lib/storage'
import type {
  AutoExportConfig,
  AutoExportInterval,
  AutoExportLastRun,
  DayOfWeek,
} from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

const INTERVAL_OPTIONS: { value: AutoExportInterval; label: string }[] = [
  { value: '1h', label: 'autoExportPage_interval1h' },
  { value: '12h', label: 'autoExportPage_interval12h' },
  { value: '1d', label: 'autoExportPage_interval1d' },
  { value: '3d', label: 'autoExportPage_interval3d' },
  { value: '7d', label: 'autoExportPage_interval7d' },
]

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: 'autoExportPage_day1' },
  { value: 2, label: 'autoExportPage_day2' },
  { value: 3, label: 'autoExportPage_day3' },
  { value: 4, label: 'autoExportPage_day4' },
  { value: 5, label: 'autoExportPage_day5' },
  { value: 6, label: 'autoExportPage_day6' },
  { value: 0, label: 'autoExportPage_day0' },
]

/**
 * Mirrors the normalized last run as React state, re-reading it whenever
 * `autoExportLastRunStore` changes (the read performs a legacy migration, so
 * a raw storage read is not enough).
 * @returns The last auto-export run, or `null` if it never ran.
 */
function useLastRun(): AutoExportLastRun | null {
  const [lastRun, setLastRun] = useState<AutoExportLastRun | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const value = await readAutoExportLastRun()
      if (isMounted) setLastRun(value)
    }
    void load()
    const unwatch = autoExportLastRunStore.watch(() => {
      void load()
    })
    return () => {
      isMounted = false
      unwatch()
    }
  }, [])

  return lastRun
}

/**
 * Formats an epoch-millisecond timestamp as a locale-aware date and time.
 * @param at Epoch milliseconds.
 * @returns The formatted string.
 */
function formatDateTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(at))
}

/**
 * Shows the discreet "Saved" toast after a setting persists.
 */
function notifySaved(): void {
  toast.add({ title: i18n.t('autoExportPage_saved'), timeout: 1500 })
}

interface StatusCardProperties {
  config: AutoExportConfig
  folder: string
}

/**
 * The status card: last-run badge, failure details, next run, and the
 * "Export now" button. Export now uses the on-screen formats and folder and
 * never moves the schedule.
 * @param properties The persisted config and the on-screen folder text.
 * @param properties.config The persisted auto-export config.
 * @param properties.folder The folder text currently on screen.
 * @returns The status card element.
 */
function StatusCard({ config, folder }: StatusCardProperties) {
  const [nextRun] = useStorageItem(autoExportNextRunStore)
  const lastRun = useLastRun()
  const [isRunning, setIsRunning] = useState(false)

  const handleExportNow = async () => {
    setIsRunning(true)
    const message: RunManualExportMessage = {
      type: RUN_MANUAL_EXPORT_MESSAGE_TYPE,
      formats: config.formats,
      path: resolveFolder(folder, config.path),
    }
    try {
      const response = (await browser.runtime.sendMessage(message)) as
        RunManualExportResponse | undefined
      if (response?.ok) {
        toast.add({
          title: i18n.t('exportNowSuccess'),
          type: 'success',
        })
      } else {
        toast.add({
          title: i18n.t('exportNowFailed'),
          description: response?.error,
          type: 'error',
        })
      }
    } catch (error) {
      toast.add({
        title: i18n.t('exportNowFailed'),
        description: error instanceof Error ? error.message : String(error),
        type: 'error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  let lastRunBadge: React.ReactNode
  if (lastRun === null) {
    lastRunBadge = (
      <Badge variant="outline">{i18n.t('autoExportNeverRun')}</Badge>
    )
  } else if (lastRun.ok) {
    lastRunBadge = (
      <Badge variant="secondary">
        <CircleCheckIcon data-icon="inline-start" />
        {i18n.t('autoExportPage_succeeded')}
      </Badge>
    )
  } else {
    lastRunBadge = (
      <Badge variant="destructive">
        <CircleAlertIcon data-icon="inline-start" />
        {i18n.t('autoExportPage_failed')}
      </Badge>
    )
  }

  const nextRunStatus = resolveNextRunStatus(config.enabled, nextRun)
  let nextRunText: string
  if (nextRunStatus.kind === 'off') {
    nextRunText = i18n.t('autoExportPage_off')
  } else if (nextRunStatus.kind === 'scheduling') {
    nextRunText = i18n.t('autoExportScheduling')
  } else {
    nextRunText = formatDateTime(nextRunStatus.nextRun)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.t('autoExportPage_statusTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {i18n.t('autoExportPage_lastRun')}
              </dt>
              <dd className="flex items-center gap-2">
                {lastRunBadge}
                {lastRun !== null && (
                  <span className="text-muted-foreground">
                    {formatDateTime(lastRun.at)}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {i18n.t('autoExportPage_nextRun')}
              </dt>
              <dd>{nextRunText}</dd>
            </div>
          </dl>
          {lastRun !== null && !lastRun.ok && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{i18n.t('autoExportPage_failureTitle')}</AlertTitle>
              <AlertDescription>
                {lastRun.error || i18n.t('exportNowFailed')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          onClick={handleExportNow}
          disabled={isRunning}
        >
          {isRunning ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          {i18n.t('exportNow')}
        </Button>
      </CardFooter>
    </Card>
  )
}

/**
 * The Auto-export screen: a status card above a settings card whose every
 * control persists on change (no draft, no Save button) and shows a
 * discreet "Saved" toast. The background watcher re-arms the alarm.
 * @returns The Auto-export page.
 */
export function AutoExportRoute() {
  const [config, setConfig] = useStorageItem(autoExportConfigStore)
  const [notifyOnFailure, setNotifyOnFailure] = useStorageItem(
    autoExportNotifyOnFailureStore,
  )
  const [folderDraft, setFolderDraft] = useState<string | null>(null)

  const [keepLastDraft, setKeepLastDraft] = useState<string | null>(null)

  const folder = folderDraft ?? config.path
  const keepLast = config.keepLast ?? 10
  const keepLastText = keepLastDraft ?? String(keepLast)
  const isKeepLastInvalid = parseKeepLast(keepLastText) === null
  const isOff = !config.enabled
  const isTimeUnused = config.interval === '1h' || config.interval === '12h'
  const isWeekly = config.interval === '7d'
  const dayItems = DAY_OPTIONS.map(({ value, label }) => ({
    value: String(value),
    label: i18n.t(label as 'autoExportPage_day0'),
  }))

  const save = async (patch: Partial<AutoExportConfig>) => {
    await setConfig({ ...(await autoExportConfigStore.getValue()), ...patch })
    notifySaved()
  }

  const commitFolder = async () => {
    const next = resolveFolder(folder, config.path)
    setFolderDraft(null)
    if (next !== config.path) await save({ path: next })
  }

  const commitKeepLast = async () => {
    const parsed = parseKeepLast(keepLastText)
    if (parsed === null) return
    setKeepLastDraft(null)
    if (parsed !== keepLast) await save({ keepLast: parsed })
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <StatusCard config={config} folder={folder} />
      <Card>
        <CardHeader>
          <CardTitle>{i18n.t('autoExportPage_settingsTitle')}</CardTitle>
          <CardDescription>
            {i18n.t('autoExportPage_settingsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="auto-export-enabled">
                  {i18n.t('enableAutoExport')}
                </FieldLabel>
                <FieldDescription>
                  {i18n.t('enableAutoExportDescription')}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="auto-export-enabled"
                checked={config.enabled}
                onCheckedChange={(enabled) => save({ enabled })}
              />
            </Field>

            <FieldSet data-disabled={isOff || undefined} disabled={isOff}>
              <FieldLegend variant="label">
                {i18n.t('autoExportPage_frequency')}
              </FieldLegend>
              <ToggleGroup
                variant="outline"
                aria-label={i18n.t('autoExportPage_frequency')}
                value={[config.interval]}
                disabled={isOff}
                onValueChange={(value) => {
                  const [interval] = value as AutoExportInterval[]
                  if (interval) void save({ interval })
                }}
              >
                {INTERVAL_OPTIONS.map(({ value, label }) => (
                  <ToggleGroupItem key={value} value={value}>
                    {i18n.t(label as 'autoExportPage_interval1d')}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>

            {isWeekly && (
              <Field data-disabled={isOff || undefined}>
                <FieldLabel htmlFor="auto-export-day">
                  {i18n.t('autoExportPage_dayOfWeek')}
                </FieldLabel>
                <Select
                  items={dayItems}
                  value={String(config.dayOfWeek)}
                  disabled={isOff}
                  onValueChange={(value) =>
                    void save({ dayOfWeek: Number(value) as DayOfWeek })
                  }
                >
                  <SelectTrigger id="auto-export-day" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {dayItems.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field data-disabled={isOff || isTimeUnused || undefined}>
              <FieldLabel htmlFor="auto-export-time">
                {i18n.t('preferredExportTime')}
              </FieldLabel>
              <TimePicker
                id="auto-export-time"
                value={config.preferredTime}
                onChange={(preferredTime) => void save({ preferredTime })}
                hourLabel={i18n.t('hoursLabel')}
                minuteLabel={i18n.t('minutesLabel')}
                periodLabel={i18n.t('periodLabel')}
                disabled={isOff || isTimeUnused}
              />
              {isTimeUnused && (
                <FieldDescription>
                  {i18n.t('timeSelectionUnavailable')}
                </FieldDescription>
              )}
            </Field>

            <Field data-disabled={isOff || undefined}>
              <FieldLabel htmlFor="auto-export-folder">
                {i18n.t('exportPath')}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>
                    {i18n.t('autoExportPage_downloadsPrefix')}
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="auto-export-folder"
                  value={folder}
                  disabled={isOff}
                  onChange={(event) => setFolderDraft(event.target.value)}
                  onBlur={() => void commitFolder()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
              </InputGroup>
              <FieldDescription>
                {i18n.t('autoExportPage_folderDescription')}
              </FieldDescription>
            </Field>

            <FieldSet data-disabled={isOff || undefined} disabled={isOff}>
              <FieldLegend variant="label">
                {i18n.t('autoExportFormats')}
              </FieldLegend>
              <ToggleGroup
                multiple
                variant="outline"
                aria-label={i18n.t('autoExportFormats')}
                value={config.formats}
                disabled={isOff}
                onValueChange={(value) =>
                  void save({
                    formats: resolveFormats(
                      value as ExportFormat[],
                      config.formats,
                    ),
                  })
                }
              >
                {EXPORT_FORMATS.map((value) => (
                  <ToggleGroupItem key={value} value={value}>
                    {EXPORT_FORMAT_INFO[value].label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>
                {i18n.t('autoExportPage_formatsDescription')}
              </FieldDescription>
            </FieldSet>

            <Field
              data-disabled={isOff || undefined}
              data-invalid={isKeepLastInvalid || undefined}
            >
              <FieldLabel htmlFor="auto-export-keep-last">
                {i18n.t('autoExportPage_keepLast')}
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="auto-export-keep-last"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={keepLastText}
                  disabled={isOff}
                  aria-invalid={isKeepLastInvalid}
                  onChange={(event) => setKeepLastDraft(event.target.value)}
                  onBlur={() => {
                    if (isKeepLastInvalid) setKeepLastDraft(null)
                    else void commitKeepLast()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
              </InputGroup>
              {isKeepLastInvalid ? (
                <FieldError>
                  {i18n.t('autoExportPage_keepLastInvalid')}
                </FieldError>
              ) : (
                <FieldDescription>
                  {i18n.t('autoExportPage_keepLastDescription')}
                </FieldDescription>
              )}
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="auto-export-notify-on-failure">
                  {i18n.t('autoExportPage_notifyOnFailure')}
                </FieldLabel>
                <FieldDescription>
                  {i18n.t('autoExportPage_notifyOnFailureDescription')}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="auto-export-notify-on-failure"
                checked={notifyOnFailure}
                onCheckedChange={async (next) => {
                  await setNotifyOnFailure(next)
                  notifySaved()
                }}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
