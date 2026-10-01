import { i18n } from '#i18n'
import { SettingsIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { APP_ROUTES, getAppUrl } from '@/lib/app-url'

function openAppRoute(route: string): void {
  void browser.tabs.create({ url: getAppUrl(route) })
}

/**
 * Popup footer: an "Open app" button and a settings icon button, each
 * opening the full-page App in a new tab.
 * @returns The footer element.
 */
export function PopupFooter() {
  return (
    <footer className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => openAppRoute(APP_ROUTES.export)}
      >
        {i18n.t('popup_openApp')}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={i18n.t('popup_settings')}
        onClick={() => openAppRoute(APP_ROUTES.settings)}
      >
        <SettingsIcon />
      </Button>
    </footer>
  )
}
