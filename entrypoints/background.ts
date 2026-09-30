import { i18n } from '#i18n'

import { ALARM_NAME, runAutoExport, syncAlarm } from '@/lib/auto-export'
import { autoExportConfigStore } from '@/lib/storage'

/**
 * Extension service worker entrypoint. On first install it opens
 * `welcome.html`; on every subsequent update it opens `update.html` (which
 * reads the new version's changelog). It also keeps the `auto-export` alarm
 * in sync with {@link autoExportConfigStore}: once on browser startup, and
 * again every time the auto-export config changes, so a config edit takes
 * effect without waiting for the next browser restart.
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    switch (reason) {
      case 'install': {
        console.log(i18n.t('extensionInstalled'))
        void browser.tabs.create({
          url: browser.runtime.getURL('/welcome.html'),
        })
        break
      }

      case 'update': {
        const version = browser.runtime.getManifest().version
        console.log(i18n.t('extensionUpdated', [version]))
        void browser.tabs.create({
          url: browser.runtime.getURL('/update.html'),
        })
        break
      }

      case 'chrome_update':
      case 'shared_module_update': {
        break
      }
    }
  })

  browser.runtime.onStartup.addListener(() => {
    void (async () => {
      try {
        await syncAlarm()
      } catch (error) {
        console.error(error)
      }
    })()
  })

  autoExportConfigStore.watch(() => {
    void (async () => {
      try {
        await syncAlarm()
      } catch (error) {
        console.error(error)
      }
    })()
  })

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      void (async () => {
        try {
          await runAutoExport()
        } catch (error) {
          console.error(error)
        }
      })()
    }
  })
})
