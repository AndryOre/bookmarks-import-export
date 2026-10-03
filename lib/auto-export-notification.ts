import { i18n } from '#i18n'

import { APP_ROUTES, getAppUrl } from '@/lib/app-url'
import { autoExportNotifyOnFailureStore } from '@/lib/storage'

/**
 * Fixed id of the Failure notification. Creating a notification with an id
 * that already exists replaces it, so repeated failures never stack.
 */
export const FAILURE_NOTIFICATION_ID = 'auto-export-failure'

/**
 * Shows the Failure notification for a failed Auto-export run, unless the
 * user turned it off. Never throws: a notification problem must not mask the
 * export error that triggered it.
 * @param reason The error message of the failed run.
 * @returns Resolves once the notification was created or skipped.
 */
export async function notifyAutoExportFailure(reason: string): Promise<void> {
  try {
    if (!(await autoExportNotifyOnFailureStore.getValue())) return
    await browser.notifications.create(FAILURE_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icons/128.png'),
      title: i18n.t('autoExportFailureNotification_title'),
      message: i18n.t('autoExportFailureNotification_message', [reason]),
    })
  } catch (error) {
    console.error(error)
  }
}

/**
 * Opens the Auto-export page and dismisses the notification when the user
 * clicks the Failure notification. Other notifications are ignored.
 * @param notificationId The id of the clicked notification.
 * @returns Resolves once the page tab was requested.
 */
export async function handleNotificationClick(
  notificationId: string,
): Promise<void> {
  if (notificationId !== FAILURE_NOTIFICATION_ID) return
  await browser.tabs.create({ url: getAppUrl(APP_ROUTES.autoExport) })
  await browser.notifications.clear(notificationId)
}
