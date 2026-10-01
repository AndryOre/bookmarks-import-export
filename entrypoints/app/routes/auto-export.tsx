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
import { resolveFolder, resolveFormats } from '@/lib/auto-export-form'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
} from '@/lib/storage'
import type {
  AutoExportConfig,
  AutoExportFormat,
  AutoExportInterval,
  AutoExportLastRun,
} from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

const DOWNLOADS_PREFIX = 'Downloads/'

const INTERVAL_OPTIONS: { value: AutoExportInterval; label: string }[] = [
  { value: '12h', label: 'autoExportPage_interval12h' },
  { value: '1d', label: 'autoExportPage_interval1d' },
  { value: '3d', label: 'autoExportPage_interval3d' },
  { value: '7d', label: 'autoExportPage_interval7d' },
]

const FORMAT_OPTIONS: { value: AutoExportFormat; label: string }[] = [
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
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

  let nextRunText: string
  if (!config.enabled) {
    nextRunText = i18n.t('autoExportPage_off')
  } else if (nextRun === null) {
    nextRunText = i18n.t('autoExportNeverRun')
  } else {
    nextRunText = formatDateTime(nextRun)
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
  const [folderDraft, setFolderDraft] = useState<string | null>(null)

  const folder = folderDraft ?? config.path
  const isOff = !config.enabled
  const isTimeUnused = config.interval === '12h'

  const save = async (patch: Partial<AutoExportConfig>) => {
    await setConfig({ ...(await autoExportConfigStore.getValue()), ...patch })
    notifySaved()
  }

  const commitFolder = async () => {
    const next = resolveFolder(folder, config.path)
    setFolderDraft(null)
    if (next !== config.path) await save({ path: next })
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
                  <InputGroupText>{DOWNLOADS_PREFIX}</InputGroupText>
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
                      value as AutoExportFormat[],
                      config.formats,
                    ),
                  })
                }
              >
                {FORMAT_OPTIONS.map(({ value, label }) => (
                  <ToggleGroupItem key={value} value={value}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>
                {i18n.t('autoExportPage_formatsDescription')}
              </FieldDescription>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
