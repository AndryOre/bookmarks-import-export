import { i18n } from '#i18n';
import { autoExportConfigStore } from '@/lib/storage';
import { syncAlarm, runAutoExport, ALARM_NAME } from '@/lib/auto-export';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    switch (reason) {
      case 'install': {
        console.log(i18n.t('extensionInstalled'));
        browser.tabs.create({
          url: browser.runtime.getURL('/welcome.html'),
        });
        break;
      }

      case 'update': {
        const version = browser.runtime.getManifest().version;
        console.log(i18n.t('extensionUpdated', [version]));
        browser.tabs.create({
          url: browser.runtime.getURL('/update.html'),
        });
        break;
      }

      case 'chrome_update':
      case 'shared_module_update':
        break;
    }
  });

  browser.runtime.onStartup.addListener(() => {
    syncAlarm().catch(console.error);
  });

  autoExportConfigStore.watch(() => {
    syncAlarm().catch(console.error);
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      runAutoExport().catch(console.error);
    }
  });
});
