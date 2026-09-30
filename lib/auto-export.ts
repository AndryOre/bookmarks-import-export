import { exportToCSV } from '@/lib/exporters/export-csv'
import { exportToHTML } from '@/lib/exporters/export-html'
import { exportToJSON } from '@/lib/exporters/export-json'
import { formatFilenameTemplate } from '@/lib/filename-template'
import { downloadViaOffscreenDocument } from '@/lib/offscreen-download'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
} from '@/lib/storage'
import type {
  AutoExportInterval,
  AutoExportLastRun,
  AutoExportTrigger,
} from '@/lib/types'

/**
 * Name of the `browser.alarms` alarm that triggers {@link runAutoExport}.
 */
export const ALARM_NAME = 'auto-export'

/**
 * How long after `syncAlarm` finds an overdue next-run to fire the catch-up
 * alarm. Kept short (not immediate) so a burst of startup work doesn't race
 * the export.
 */
const CATCH_UP_DELAY_MS = 60_000

/**
 * Badge background color for a failed scheduled/catch-up run — the
 * `--destructive` design token's light-mode value
 * (`oklch(0.577 0.245 27.325)`), hardcoded because `chrome.action` takes a
 * literal color, not a CSS variable.
 */
const FAILURE_BADGE_COLOR = '#DC2626'

const DAY_INTERVALS: Record<'1d' | '3d' | '7d', number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
}

/**
 * What caused a `syncAlarm` call, so it knows how to derive the next run:
 * - `config-change`: `enabled`/`interval`/`preferredTime` changed — always
 *   recompute the next run from now and store it.
 * - `startup`/`install`/`update`: read the stored next run (computing it if
 *   missing) rather than recomputing, so a config that hasn't changed keeps
 *   its already-scheduled due time across a browser restart or extension
 *   update.
 */
export type SyncAlarmTrigger =
  'config-change' | 'startup' | 'install' | 'update'

/**
 * Pure computation of the next auto-export due time. `12h` always fires
 * `from` plus 12 hours, ignoring `preferredTime` — it's frequent enough that
 * a user-chosen time of day wouldn't be meaningful. The day-or-longer
 * intervals (`1d`/`3d`/`7d`) target `preferredTime` local time, computed one
 * of two ways depending on `isAnchoredToCompletedRun`:
 * - `true` (anchored to a just-completed run): the interval's day count
 *   after `from`'s calendar date, at `preferredTime`. Used by
 *   {@link runAutoExport} so a completed run always reschedules exactly N
 *   days out, regardless of what time it finished.
 * - `false` ((re)configuring): the next upcoming occurrence of
 *   `preferredTime` — today if it hasn't passed yet relative to `from`,
 *   otherwise tomorrow. Used by `syncAlarm` when the config changes or when
 *   no next-run is stored yet.
 *
 * Every date here is built with `Date`'s local-time setters (`setDate`/
 * `setHours`) rather than fixed-duration millisecond arithmetic, so a
 * result that spans a DST transition lands on the correct wall-clock time
 * instead of drifting by the transition's hour.
 * @param interval The configured auto-export interval.
 * @param preferredTime `HH:mm` local time of day, used for day-or-longer intervals.
 * @param from The reference instant (epoch milliseconds) to compute from.
 * @param isAnchoredToCompletedRun See above.
 * @returns The next due time, as epoch milliseconds.
 */
export function computeNextRun(
  interval: AutoExportInterval,
  preferredTime: string,
  from: number,
  isAnchoredToCompletedRun: boolean,
): number {
  if (interval === '12h') {
    return from + 12 * 60 * 60 * 1000
  }

  const [hoursRaw, minutesRaw] = preferredTime.split(':').map(Number)
  const hours = hoursRaw ?? 0
  const minutes = minutesRaw ?? 0
  const days = DAY_INTERVALS[interval]

  if (isAnchoredToCompletedRun) {
    const next = new Date(from)
    next.setDate(next.getDate() + days)
    next.setHours(hours, minutes, 0, 0)
    return next.getTime()
  }

  const next = new Date(from)
  next.setHours(hours, minutes, 0, 0)
  if (next.getTime() <= from) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

/**
 * Arms {@link ALARM_NAME} as a one-shot alarm firing at `when` (clearing any
 * existing alarm first), clamped to at least a moment from now — a `when`
 * in the past or equal to `Date.now()` would make `browser.alarms.create`
 * fire immediately in a tight loop with whatever just re-armed it.
 * @param when The epoch milliseconds the alarm should fire at.
 * @returns Resolves once the alarm has been cleared and recreated.
 */
async function armAlarm(when: number): Promise<void> {
  await browser.alarms.clear(ALARM_NAME)
  await browser.alarms.create(ALARM_NAME, {
    when: Math.max(when, Date.now() + 100),
  })
}

/**
 * Keeps the `auto-export` alarm and {@link autoExportNextRunStore} in sync
 * with the current `AutoExportConfig` and `trigger`:
 * - Disabled, or zero formats selected: clears the alarm and the stored
 *   next run.
 * - `config-change`: recomputes the next run from now (the next upcoming
 *   `preferredTime` occurrence) and stores it.
 * - `startup`/`install`/`update`: reads the stored next run, computing one
 *   if missing. If that due time has already passed, arms a catch-up alarm
 *   {@link CATCH_UP_DELAY_MS} out instead of firing immediately — but never
 *   overwrites the stored next run with the catch-up time, since that
 *   store is the *actual* due time, not when the catch-up alarm happens to
 *   fire.
 * @param trigger What caused this sync — see {@link SyncAlarmTrigger}.
 * @returns Resolves once the alarm and next-run store reflect `trigger`.
 */
export async function syncAlarm(trigger: SyncAlarmTrigger): Promise<void> {
  const config = await autoExportConfigStore.getValue()

  if (!config.enabled || config.formats.length === 0) {
    await browser.alarms.clear(ALARM_NAME)
    await autoExportNextRunStore.setValue(null)
    return
  }

  const now = Date.now()
  let nextRun: number

  if (trigger === 'config-change') {
    nextRun = computeNextRun(config.interval, config.preferredTime, now, false)
    await autoExportNextRunStore.setValue(nextRun)
  } else {
    const stored = await autoExportNextRunStore.getValue()
    if (stored === null) {
      nextRun = computeNextRun(
        config.interval,
        config.preferredTime,
        now,
        false,
      )
      await autoExportNextRunStore.setValue(nextRun)
    } else {
      nextRun = stored
    }
  }

  await armAlarm(nextRun <= now ? now + CATCH_UP_DELAY_MS : nextRun)
}

/**
 * Sanitises the user-configured auto-export output path before it's used as
 * a `browser.downloads.download` filename prefix: strips a leading `/` (the
 * path is relative to the browser's downloads folder, not absolute), removes
 * `..` segments to prevent escaping that folder, collapses repeated slashes,
 * and strips characters Windows forbids in filenames/paths (`< > : " | ? *`
 * and control characters) so the download doesn't silently fail on that
 * platform.
 * @param path The user-configured output path.
 * @returns The sanitized, downloads-relative path.
 */
function sanitizePath(path: string): string {
  return path
    .replace(/^\/+/, '')
    .replaceAll('..', '')
    .replaceAll(/[<>:"|?*\u{0}-\u{1F}]/gu, '')
    .replaceAll(/\/+/g, '/')
    .trim()
}

/**
 * Reads {@link autoExportLastRunStore}, migrating a legacy plain-`number`
 * value (this store's shape before next-run tracking existed) to
 * `{ at: <value>, ok: true, trigger: 'scheduled' }` so an upgrading user's
 * last-run history isn't lost.
 * @returns The normalized last run, or `null` if auto-export has never run.
 */
export async function readAutoExportLastRun(): Promise<AutoExportLastRun | null> {
  const value = await autoExportLastRunStore.getValue()
  if (value === null) return null
  return typeof value === 'number'
    ? { at: value, ok: true, trigger: 'scheduled' }
    : value
}

/**
 * Clears the toolbar failure badge. Called after any run (any trigger) that
 * succeeds.
 * @returns Resolves once the badge text is cleared.
 */
async function clearFailureBadge(): Promise<void> {
  await browser.action.setBadgeText({ text: '' })
}

/**
 * Sets the toolbar failure badge. Called only for a failed `scheduled` or
 * `catch-up` run — a failed `manual` run surfaces its error directly in the
 * UI that triggered it (a later ticket), not on the toolbar icon.
 * @returns Resolves once the badge text and color are set.
 */
async function setFailureBadge(): Promise<void> {
  await browser.action.setBadgeText({ text: '!' })
  await browser.action.setBadgeBackgroundColor({ color: FAILURE_BADGE_COLOR })
}

/**
 * Runs an auto-export: reads the current export settings, generates each
 * selected format, and downloads it to the configured folder via
 * {@link downloadViaOffscreenDocument} (an offscreen-document blob URL,
 * rather than a base64 data URL, so exports aren't capped by the
 * data-URL/IPC size limit). Skips entirely if auto-export is disabled or no
 * format is selected — this can happen if the alarm fires from stale state
 * just before {@link syncAlarm} clears it. Each download uses `saveAs: false`
 * (no save-dialog prompt) and `conflictAction: 'uniquify'` so a repeat run
 * never silently overwrites a previous export. The CSV branch passes a
 * narrower options object than
 * HTML/JSON because `exportToCSV` has no `hideOtherBookmarks` or
 * `includeDateGroupModified` support — the user's "hide Other Bookmarks" and
 * "group by modified date" preferences are silently ignored for CSV output.
 *
 * {@link autoExportLastRunStore} is updated only after every selected
 * download has completed (or has failed), recording `trigger` and, on
 * failure, the error message — the toolbar badge is set on a failed
 * `scheduled`/`catch-up` run and cleared on any success. For `scheduled` and
 * `catch-up` runs (not `manual`, which a later ticket's "Export now" UI
 * drives on demand), the next due time is also recomputed — anchored to
 * this run's completion, so it reschedules exactly one interval out
 * regardless of what time this run actually finished — and the alarm is
 * re-armed for it.
 * @param trigger What caused this run.
 */
export async function runAutoExport(trigger: AutoExportTrigger): Promise<void> {
  const config = await autoExportConfigStore.getValue()
  if (!config.enabled || config.formats.length === 0) return

  try {
    const [
      includeIconData,
      includeDateAdded,
      includeDateLastUsed,
      includeDateGroupModified,
      hideOtherBookmarks,
      hideParentFolder,
      filenameTemplate,
    ] = await Promise.all([
      includeIconDataStore.getValue(),
      includeDateAddedStore.getValue(),
      includeDateLastUsedStore.getValue(),
      includeDateGroupModifiedStore.getValue(),
      hideOtherBookmarksStore.getValue(),
      hideParentFolderStore.getValue(),
      exportFilenameTemplateStore.getValue(),
    ])

    const baseOptions = {
      selectedBookmarks: null,
      includeIconData,
      includeDateAdded,
      includeDateLastUsed,
      includeDateGroupModified,
      hideOtherBookmarks,
      hideParentFolder,
    }

    const baseName = formatFilenameTemplate(filenameTemplate)
    const sanitized = sanitizePath(config.path)
    const prefix = sanitized
      ? `${sanitized}${sanitized.endsWith('/') ? '' : '/'}`
      : ''

    const downloads: Promise<void>[] = []

    if (config.formats.includes('html')) {
      downloads.push(
        (async () => {
          const content = await exportToHTML(baseOptions)
          await downloadViaOffscreenDocument(
            content,
            'text/html',
            `${prefix}${baseName}.html`,
          )
        })(),
      )
    }

    if (config.formats.includes('json')) {
      downloads.push(
        (async () => {
          const data = await exportToJSON(baseOptions)
          await downloadViaOffscreenDocument(
            JSON.stringify(data, null, 2),
            'application/json',
            `${prefix}${baseName}.json`,
          )
        })(),
      )
    }

    if (config.formats.includes('csv')) {
      downloads.push(
        (async () => {
          const content = await exportToCSV({
            selectedBookmarks: null,
            includeIconData,
            includeDateAdded,
            includeDateLastUsed,
            hideParentFolder,
          })
          await downloadViaOffscreenDocument(
            content,
            'text/csv',
            `${prefix}${baseName}.csv`,
          )
        })(),
      )
    }

    await Promise.all(downloads)
    await autoExportLastRunStore.setValue({ at: Date.now(), ok: true, trigger })
    await clearFailureBadge()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await autoExportLastRunStore.setValue({
      at: Date.now(),
      ok: false,
      error: message,
      trigger,
    })
    if (trigger !== 'manual') {
      await setFailureBadge()
      await rescheduleAfterRun(config.interval, config.preferredTime)
    }
    throw error
  }

  if (trigger !== 'manual') {
    await rescheduleAfterRun(config.interval, config.preferredTime)
  }
}

/**
 * Recomputes and stores the next due time anchored to this just-completed
 * run, then re-arms the alarm for it. Shared by both the success and
 * failure paths of {@link runAutoExport} for `scheduled`/`catch-up`
 * triggers, so a failing scheduled export still reschedules instead of
 * going silent.
 * @param interval The configured auto-export interval.
 * @param preferredTime The configured `HH:mm` preferred time.
 * @returns Resolves once the next-run store and alarm are updated.
 */
async function rescheduleAfterRun(
  interval: AutoExportInterval,
  preferredTime: string,
): Promise<void> {
  const nextRun = computeNextRun(interval, preferredTime, Date.now(), true)
  await autoExportNextRunStore.setValue(nextRun)
  await armAlarm(nextRun)
}
