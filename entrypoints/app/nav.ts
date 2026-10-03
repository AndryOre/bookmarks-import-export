import {
  Copy,
  Download,
  History,
  RefreshCw,
  Settings,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { APP_ROUTES } from '@/lib/app-url'

/**
 * The sidebar's navigation entries, in display order. `titleKey` is the
 * i18n key used for both the nav label and the page title.
 */
export const NAV_ITEMS = [
  { route: APP_ROUTES.export, titleKey: 'shell_navExport', icon: Download },
  { route: APP_ROUTES.import, titleKey: 'shell_navImport', icon: Upload },
  {
    route: APP_ROUTES.duplicates,
    titleKey: 'shell_navDuplicates',
    icon: Copy,
  },
  {
    route: APP_ROUTES.autoExport,
    titleKey: 'shell_navAutoExport',
    icon: RefreshCw,
  },
  { route: APP_ROUTES.settings, titleKey: 'shell_navSettings', icon: Settings },
  { route: APP_ROUTES.whatsNew, titleKey: 'shell_navWhatsNew', icon: History },
] as const satisfies readonly {
  route: string
  titleKey: string
  icon: LucideIcon
}[]

/**
 * Resolves the i18n key of the page title for a route, including routes
 * that are not in the sidebar (Welcome).
 * @param pathname The current router pathname.
 * @returns The i18n key of the page title.
 */
export function getTitleKey(pathname: string) {
  const item = NAV_ITEMS.find((navItem) => navItem.route === pathname)
  if (item) return item.titleKey
  return pathname === APP_ROUTES.welcome
    ? 'shell_titleWelcome'
    : 'shell_navExport'
}

/**
 * Whether a pathname is a real App route. The empty index and unknown
 * paths are not: the router only passes through them on its way to Export.
 * @param pathname The router pathname to check.
 * @returns `true` for a nav route or the Welcome route.
 */
export function isKnownRoute(pathname: string): boolean {
  return (
    pathname === APP_ROUTES.welcome ||
    NAV_ITEMS.some((navItem) => navItem.route === pathname)
  )
}
