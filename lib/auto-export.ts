import { notifyAutoExportFailure } from '@/lib/auto-export-notification'
import {
  applyRetention,
  recordSavedDownload,
} from '@/lib/auto-export-retention'
import { EXPORT_FORMAT_INFO, type ExportFormat } from '@/lib/export-formats'
import { formatFilenameTemplate } from '@/lib/filename-template'
import { downloadViaOffscreenDocument } from '@/lib/offscreen-download'
import { sanitizePathSegment } from '@/lib/path-segment'
import { renderExport } from '@/lib/render-export'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
  autoExportRunInFlightStore,
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
  DayOfWeek,
} from '@/lib/types'

/**
 * Name of the `browser.alarms` alarm that triggers {@link runAutoExport}.
 */
export const ALARM_NAME = 'auto-export'

/**
 * `browser.runtime.sendMessage` type asking the background service worker to
 * run an "Export now" — a `manual`-triggered {@link runAutoExport} using the
 * on-screen draft formats/path from the Auto-export page, regardless of
 * whether auto-export is enabled or what's currently persisted.
 */
export const RUN_MANUAL_EXPORT_MESSAGE_TYPE = 'auto-export-run-manual'

/**
 * Sent by the Auto-export page's "Export now" button to the background
 * service worker.
 */
export interface RunManualExportMessage {
  type: typeof RUN_MANUAL_EXPORT_MESSAGE_TYPE
  formats: ExportFormat[]
  path: string
}

/**
 * Reply to a {@link RunManualExportMessage}: `ok: true` on a successful
 * export, or `ok: false` with the error message on failure.
 */
export interface RunManualExportResponse {
  ok: boolean
  error?: string
}

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

/**
 * How long an in-flight run marker is trusted before it is considered left
 * behind by a killed service worker.
 */
const RUN_IN_FLIGHT_TTL_MS = 10 * 60_000

/**
 * Delay of the safety retry alarm armed before a run starts. Longer than
 * {@link RUN_IN_FLIGHT_TTL_MS} so that, if the run died, the marker is stale
 * by the time the retry fires.
 */
const RETRY_DELAY_MS = RUN_IN_FLIGHT_TTL_MS + 60_000

const HOUR_MS = 60 * 60 * 1000

const DAY_INTERVALS: Record<'1d' | '3d', number> = {
  '1d': 1,
  '3d': 3,
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
 * Pure computation of the next auto-export due time. `1h` and `12h` always
 * fire `from` plus 1 or 12 hours, ignoring `preferredTime` — they're
 * frequent enough that a user-chosen time of day wouldn't be meaningful.
 * `1d`/`3d` target `preferredTime` local time and `7d` (weekly) targets
 * `preferredTime` on `dayOfWeek`, computed one of two ways depending on
 * `isAnchoredToCompletedRun`:
 * - `true` (anchored to a just-completed run): `1d`/`3d` land the interval's
 *   day count after `from`'s calendar date; `7d` lands on the first
 *   `dayOfWeek` strictly after `from`'s calendar date. Used by
 *   {@link runAutoExport} so a completed run always reschedules a full
 *   interval out, regardless of what time it finished.
 * - `false` ((re)configuring): the next upcoming occurrence of
 *   `preferredTime` — for `7d`, on `dayOfWeek`; otherwise today if it hasn't
 *   passed yet relative to `from`, else tomorrow. Used by `syncAlarm` when
 *   the config changes or when no next-run is stored yet.
 *
 * Every date here is built with `Date`'s local-time setters (`setDate`/
 * `setHours`) rather than fixed-duration millisecond arithmetic for the
 * time-of-day intervals, so a result that spans a DST transition lands on
 * the correct wall-clock time instead of drifting by the transition's hour.
 * @param interval The configured auto-export interval.
 * @param preferredTime `HH:mm` local time of day, used for day-or-longer intervals.
 * @param from The reference instant (epoch milliseconds) to compute from.
 * @param isAnchoredToCompletedRun See above.
 * @param dayOfWeek The weekday for the `7d` interval; Monday by default.
 * @returns The next due time, as epoch milliseconds.
 */
export function computeNextRun(
  interval: AutoExportInterval,
  preferredTime: string,
  from: number,
  isAnchoredToCompletedRun: boolean,
  dayOfWeek: DayOfWeek = 1,
): number {
  if (interval === '1h') return from + HOUR_MS
  if (interval === '12h') return from + 12 * HOUR_MS

  const [hoursRaw, minutesRaw] = preferredTime.split(':').map(Number)
  const hours = hoursRaw ?? 0
  const minutes = minutesRaw ?? 0

  if (interval === '7d') {
    const next = new Date(from)
    next.setHours(hours, minutes, 0, 0)
    if (isAnchoredToCompletedRun || next.getTime() <= from) {
      next.setDate(next.getDate() + 1)
    }
    while (next.getDay() !== dayOfWeek) {
      next.setDate(next.getDate() + 1)
    }
    next.setHours(hours, minutes, 0, 0)
    return next.getTime()
  }

  if (isAnchoredToCompletedRun) {
    const next = new Date(from)
    next.setDate(next.getDate() + DAY_INTERVALS[interval])
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
 * Next due time anchored to the run's stored due time instead of its
 * completion time: the first occurrence of the schedule strictly after both
 * `dueTime` and `now`. A `1d` 23:00 run that fires late at 00:30 therefore
 * schedules today's 23:00, not the day after. `1h`/`12h` have no wall-clock
 * target and keep firing one interval after `now`. Built with local-time
 * setters so DST transitions keep the wall-clock time.
 * @param interval The configured auto-export interval.
 * @param preferredTime `HH:mm` local time of day.
 * @param dueTime The epoch milliseconds the finished run was due at.
 * @param now The current epoch milliseconds.
 * @param dayOfWeek The weekday for the `7d` interval; Monday by default.
 * @returns The next due time, as epoch milliseconds.
 */
export function computeNextRunAfterDue(
  interval: AutoExportInterval,
  preferredTime: string,
  dueTime: number,
  now: number,
  dayOfWeek: DayOfWeek = 1,
): number {
  if (interval === '1h' || interval === '12h') {
    return computeNextRun(interval, preferredTime, now, true, dayOfWeek)
  }

  const [hoursRaw, minutesRaw] = preferredTime.split(':').map(Number)
  const hours = hoursRaw ?? 0
  const minutes = minutesRaw ?? 0
  const stepDays = interval === '7d' ? 1 : DAY_INTERVALS[interval]
  const next = new Date(dueTime)

  do {
    next.setDate(next.getDate() + stepDays)
    next.setHours(hours, minutes, 0, 0)
  } while (
    next.getTime() <= now ||
    next.getTime() <= dueTime ||
    (interval === '7d' && next.getDay() !== dayOfWeek)
  )
  return next.getTime()
}

/**
 * When the retry alarm of the run currently in flight fires, per
 * {@link autoExportRunInFlightStore} and its TTL. Callers that skip work
 * because a run is in flight re-arm the alarm at this time, so a run that
 * dies mid-way never leaves the schedule without an alarm.
 * @returns The epoch milliseconds to re-arm the alarm at, or `null` when no
 *   non-stale in-flight marker exists.
 */
export async function getAutoExportInFlightRetryAt(): Promise<number | null> {
  const startedAt = await autoExportRunInFlightStore.getValue()
  const isInFlight =
    startedAt !== null && Date.now() - startedAt < RUN_IN_FLIGHT_TTL_MS
  return isInFlight ? startedAt + RETRY_DELAY_MS : null
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
    nextRun = computeNextRun(
      config.interval,
      config.preferredTime,
      now,
      false,
      config.dayOfWeek,
    )
    await autoExportNextRunStore.setValue(nextRun)
  } else {
    const stored = await autoExportNextRunStore.getValue()
    if (stored === null) {
      nextRun = computeNextRun(
        config.interval,
        config.preferredTime,
        now,
        false,
        config.dayOfWeek,
      )
      await autoExportNextRunStore.setValue(nextRun)
    } else {
      nextRun = stored
    }
  }

  if (nextRun <= now) {
    if (trigger !== 'config-change') {
      const retryAt = await getAutoExportInFlightRetryAt()
      if (retryAt !== null) {
        await armAlarm(retryAt)
        return
      }
    }
    await armAlarm(now + CATCH_UP_DELAY_MS)
    return
  }
  await armAlarm(nextRun)
}

/**
 * Sanitises the user-configured auto-export output path before it's used as
 * a `browser.downloads.download` filename prefix. The path is relative to the
 * browser's downloads folder, so it is split on `/` and `\` and each segment has the
 * characters Windows forbids (`< > : " | ? *` and control characters)
 * removed and is cleaned with {@link sanitizePathSegment}. Segments left
 * empty, `.` or `..` are dropped, which also prevents escaping the folder.
 * @param path The user-configured output path.
 * @returns The sanitized, downloads-relative path.
 */
function sanitizePath(path: string): string {
  return path
    .split(/[/\\]/)
    .map((segment) =>
      sanitizePathSegment(segment.replaceAll(/[<>:"|?*\u{0}-\u{1F}]/gu, '')),
    )
    .filter(Boolean)
    .join('/')
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
 * Retention default used when a stored config predates `keepLast`.
 */
const DEFAULT_KEEP_LAST = 10

/**
 * Downloads one export file via {@link downloadViaOffscreenDocument} and
 * persists its download id as soon as the download starts, so retention can
 * later remove it even if the download times out or the service worker
 * restarts before the run finishes.
 * @param content The export content.
 * @param mimeType The content's MIME type.
 * @param filename The downloads-relative filename.
 * @param runAt Start time of the run, grouping this file with its siblings.
 * @returns Resolves once the download settled.
 */
async function saveDownload(
  content: string,
  mimeType: string,
  filename: string,
  runAt: number,
): Promise<void> {
  await downloadViaOffscreenDocument(
    content,
    mimeType,
    filename,
    (downloadId) => recordSavedDownload(downloadId, runAt),
  )
}

/**
 * Runs an auto-export: reads the current export settings, generates each
 * selected format, and downloads it to the configured folder via
 * {@link downloadViaOffscreenDocument} (an offscreen-document blob URL,
 * rather than a base64 data URL, so exports aren't capped by the
 * data-URL size limit; the content still travels through
 * `runtime.sendMessage`, which caps it at 64 MiB). Skips entirely if auto-export is disabled or no
 * format is selected — this can happen if the alarm fires from stale state
 * just before {@link syncAlarm} clears it. Each download uses `saveAs: false`
 * (no save-dialog prompt) and `conflictAction: 'uniquify'` so a repeat run
 * never silently overwrites a previous export. The CSV branch passes a
 * narrower options object than
 * HTML/JSON because `exportToCSV` has no `hideOtherBookmarks` or
 * `includeDateGroupModified` support — the user's "hide Other Bookmarks" and
 * "group by modified date" preferences are silently ignored for CSV output.
 *
 * After a fully successful run, retention removes Snug's own oldest files
 * beyond `keepLast` (see {@link applyRetention}); a failed run never deletes
 * anything.
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
 *
 * `overrides` lets a `manual` run (the Auto-export page's "Export now") use
 * the on-screen draft `formats`/`path` instead of what's persisted in
 * {@link autoExportConfigStore}, and bypasses the `enabled`/empty-`formats`
 * skip above — "Export now" works regardless of the Enable switch or of
 * unsaved changes.
 * @param trigger What caused this run.
 * @param overrides `formats`/`path` to use instead of the stored config.
 * @param overrides.formats The formats to export, overriding the stored config.
 * @param overrides.path The output path, overriding the stored config.
 */
export async function runAutoExport(
  trigger: AutoExportTrigger,
  overrides?: { formats: ExportFormat[]; path: string },
): Promise<void> {
  const config = await autoExportConfigStore.getValue()
  if (!overrides && (!config.enabled || config.formats.length === 0)) return

  const formats = overrides?.formats ?? config.formats
  const path = overrides?.path ?? config.path

  const runAt = Date.now()
  const isTrackedRun = trigger !== 'manual'
  if (isTrackedRun) {
    const retryAt = await getAutoExportInFlightRetryAt()
    if (retryAt !== null) {
      await armAlarm(retryAt)
      return
    }
    await autoExportRunInFlightStore.setValue(Date.now())
    await armAlarm(Date.now() + RETRY_DELAY_MS)
  }

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
    const sanitized = sanitizePath(path)
    const prefix = sanitized
      ? `${sanitized}${sanitized.endsWith('/') ? '' : '/'}`
      : ''

    const downloads = formats.map(async (format) => {
      const { extension, mimeType } = EXPORT_FORMAT_INFO[format]
      const content = await renderExport(format, baseOptions)
      await saveDownload(
        content,
        mimeType,
        `${prefix}${baseName}.${extension}`,
        runAt,
      )
    })

    await Promise.all(downloads)
    await autoExportLastRunStore.setValue({ at: Date.now(), ok: true, trigger })
    await clearFailureBadge()
    await applyRetention(config.keepLast ?? DEFAULT_KEEP_LAST)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await autoExportLastRunStore.setValue({
      at: Date.now(),
      ok: false,
      error: message,
      trigger,
    })
    await notifyAutoExportFailure(message)
    if (isTrackedRun) {
      await setFailureBadge()
      await rescheduleAfterRun()
      await autoExportRunInFlightStore.setValue(null)
    }
    throw error
  }

  if (!isTrackedRun) {
    return
  }

  await rescheduleAfterRun()
  await autoExportRunInFlightStore.setValue(null)
}

/**
 * Recomputes and stores the next due time anchored to this just-completed
 * run, then re-arms the alarm for it. Shared by both the success and
 * failure paths of {@link runAutoExport} for `scheduled`/`catch-up`
 * triggers, so a failing scheduled export still reschedules instead of
 * going silent. Re-reads the config instead of trusting the one the run
 * started with: if the user disabled auto-export or changed the schedule
 * while the run was in flight, the fresh config wins — a disabled or
 * format-less config defers to `syncAlarm('config-change')`, which clears
 * the alarm and next run rather than re-arming a stray one.
 * @returns Resolves once the next-run store and alarm are updated.
 */
async function rescheduleAfterRun(): Promise<void> {
  const config = await autoExportConfigStore.getValue()
  if (!config.enabled || config.formats.length === 0) {
    await syncAlarm('config-change')
    return
  }
  const now = Date.now()
  const dueTime = await autoExportNextRunStore.getValue()
  const nextRun =
    dueTime === null
      ? computeNextRun(
          config.interval,
          config.preferredTime,
          now,
          true,
          config.dayOfWeek,
        )
      : computeNextRunAfterDue(
          config.interval,
          config.preferredTime,
          dueTime,
          now,
          config.dayOfWeek,
        )
  await autoExportNextRunStore.setValue(nextRun)
  await armAlarm(nextRun)
}
