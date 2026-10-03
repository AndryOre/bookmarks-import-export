import { i18n } from '#i18n'

import { APP_ROUTES, getAppUrl } from '@/lib/app-url'
import {
  ALARM_NAME,
  RUN_MANUAL_EXPORT_MESSAGE_TYPE,
  runAutoExport,
  type RunManualExportMessage,
  type RunManualExportResponse,
  syncAlarm,
  type SyncAlarmTrigger,
} from '@/lib/auto-export'
import { handleNotificationClick } from '@/lib/auto-export-notification'
import {
  autoExportConfigStore,
  autoExportNextRunStore,
  lastSeenVersionStore,
} from '@/lib/storage'
import type { AutoExportConfig } from '@/lib/types'
import { isMinorOrMajorUpdate } from '@/lib/version'

/**
 * Runs `syncAlarm(trigger)`, logging (never throwing) on failure — every
 * `syncAlarm` call site in this file is fire-and-forget from an event
 * listener, so a rejected promise would otherwise be an unhandled
 * rejection.
 * @param trigger The trigger to pass through to `syncAlarm`.
 * @returns Resolves once `syncAlarm` has settled.
 */
async function syncAlarmSafely(trigger: SyncAlarmTrigger): Promise<void> {
  try {
    await syncAlarm(trigger)
  } catch (error) {
    console.error(error)
  }
}

/**
 * Whether two `AutoExportConfig`s differ in a way that should re-arm the
 * alarm: `enabled`, `interval`, `preferredTime`, or `dayOfWeek` changed outright, or
 * `formats` crossed the empty/non-empty boundary (which is functionally an
 * enable/disable even though it's the `formats` field). A `path`-only
 * change, or a `formats` change that stays non-empty (e.g. adding a second
 * format), must not recompute or re-arm — see `syncAlarm` in
 * `lib/auto-export.ts`.
 * @param previous The config before the change.
 * @param next The config after the change.
 * @returns Whether `syncAlarm('config-change')` should run for this change.
 */
function isScheduleRelevantChange(
  previous: AutoExportConfig,
  next: AutoExportConfig,
): boolean {
  return (
    previous.enabled !== next.enabled ||
    previous.interval !== next.interval ||
    previous.preferredTime !== next.preferredTime ||
    previous.dayOfWeek !== next.dayOfWeek ||
    (previous.formats.length === 0) !== (next.formats.length === 0)
  )
}

/**
 * Runs a `manual`-triggered {@link runAutoExport} using `message`'s
 * on-screen `formats`/`path`, for the Auto-export page's "Export now" button.
 * Never touches {@link autoExportNextRunStore} or the `auto-export` alarm —
 * `runAutoExport` already skips both for a `manual` trigger — and never
 * throws: failure is reported back to the caller as `{ ok: false, error }`
 * instead of an unhandled rejection or a dropped `sendMessage` response.
 * @param message The "Export now" request.
 * @returns The run's outcome, to reply to the sender with.
 */
async function runManualExport(
  message: RunManualExportMessage,
): Promise<RunManualExportResponse> {
  try {
    await runAutoExport('manual', {
      formats: message.formats,
      path: message.path,
    })
    return { ok: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { ok: false, error: errorMessage }
  }
}

/**
 * Re-arms the `auto-export` alarm when auto-export is enabled but no alarm
 * exists (e.g. the service worker was killed mid-run before the run could
 * re-arm it). Runs on every service worker start; never throws.
 * @returns Resolves once the check (and any re-arm) has settled.
 */
async function restoreMissingAlarm(): Promise<void> {
  try {
    const config = await autoExportConfigStore.getValue()
    if (
      !config.enabled ||
      config.formats.length === 0 ||
      (await browser.alarms.get(ALARM_NAME))
    )
      return
    await syncAlarm('startup')
  } catch (error) {
    console.error(error)
  }
}

/**
 * Extension service worker entrypoint. On first install it opens the
 * App's Welcome route (and marks that version's changelog as seen); on a
 * minor or major update it opens the App's What's new route (patch updates
 * open nothing), leaving the version unseen so the sidebar shows its dot
 * until that route is visited. It also keeps the `auto-export` alarm
 * and {@link autoExportNextRunStore} in sync via `syncAlarm`: once on
 * browser startup and on every `onInstalled` reason (both may need to arm a
 * catch-up run for a due time that passed while the browser/extension was
 * unavailable), and again whenever the auto-export config changes in a way
 * that affects scheduling (see {@link isScheduleRelevantChange}).
 */
export default defineBackground(() => {
  void restoreMissingAlarm()

  browser.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
    switch (reason) {
      case 'install': {
        console.log(i18n.t('extensionInstalled'))
        void browser.tabs.create({ url: getAppUrl(APP_ROUTES.welcome) })
        void lastSeenVersionStore
          .setValue(browser.runtime.getManifest().version)
          .catch(console.error)
        void syncAlarmSafely('install')
        break
      }

      case 'update': {
        const version = browser.runtime.getManifest().version
        console.log(i18n.t('extensionUpdated', [version]))
        if (isMinorOrMajorUpdate(previousVersion, version)) {
          void browser.tabs.create({ url: getAppUrl(APP_ROUTES.whatsNew) })
        }
        void syncAlarmSafely('update')
        break
      }

      case 'chrome_update':
      case 'shared_module_update': {
        void syncAlarmSafely('update')
        break
      }
    }
  })

  browser.runtime.onStartup.addListener(() => {
    void syncAlarmSafely('startup')
  })

  autoExportConfigStore.watch((next, previous) => {
    if (!isScheduleRelevantChange(previous, next)) return
    void syncAlarmSafely('config-change')
  })

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM_NAME) return

    void (async () => {
      try {
        const storedNextRun = await autoExportNextRunStore.getValue()
        const isCatchUp =
          storedNextRun !== null && alarm.scheduledTime > storedNextRun + 2000
        await runAutoExport(isCatchUp ? 'catch-up' : 'scheduled')
      } catch (error) {
        console.error(error)
      }
    })()
  })

  browser.notifications.onClicked.addListener((notificationId) => {
    void handleNotificationClick(notificationId).catch(console.error)
  })

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (
      typeof message !== 'object' ||
      message === null ||
      (message as { type?: unknown }).type !== RUN_MANUAL_EXPORT_MESSAGE_TYPE
    ) {
      return
    }

    void runManualExport(message as RunManualExportMessage).then(sendResponse)
    return true
  })
})
