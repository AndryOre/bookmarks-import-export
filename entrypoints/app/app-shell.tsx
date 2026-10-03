import { i18n } from '#i18n'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Wordmark } from '@/components/wordmark'
import { APP_ROUTES } from '@/lib/app-url'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  lastSeenVersionStore,
} from '@/lib/storage'
import { useStorageItem } from '@/lib/use-storage-item'

import { getTitleKey, NAV_ITEMS } from './nav'

type NavStatus = 'none' | 'success' | 'destructive' | 'primary'

const STATUS_DOT_CLASS: Record<Exclude<NavStatus, 'none'>, string> = {
  success: 'bg-success',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
}

/**
 * Derives the Auto-export nav dot: destructive when the last run failed,
 * success when scheduled backups are on, none otherwise.
 * @returns The status for the Auto-export nav item and its accessible label.
 */
function useAutoExportStatus(): { status: NavStatus; label?: string } {
  const [config] = useStorageItem(autoExportConfigStore)
  const [lastRun] = useStorageItem(autoExportLastRunStore)
  if (typeof lastRun === 'object' && lastRun !== null && !lastRun.ok) {
    return { status: 'destructive', label: i18n.t('shell_autoExportFailed') }
  }
  return config.enabled
    ? { status: 'success', label: i18n.t('shell_autoExportOn') }
    : { status: 'none' }
}

/**
 * Tracks whether the installed version's changelog is unseen, and marks it
 * as seen while the What's new screen is open.
 * @param pathname The current router pathname.
 * @returns `true` while the installed version differs from the last seen one.
 */
function useIsWhatsNewUnseen(pathname: string): boolean {
  const [lastSeenVersion, setLastSeenVersion] =
    useStorageItem(lastSeenVersionStore)
  const installedVersion = browser.runtime.getManifest().version
  const isOnWhatsNew = pathname === APP_ROUTES.whatsNew

  useEffect(() => {
    if (isOnWhatsNew && lastSeenVersion !== installedVersion) {
      void setLastSeenVersion(installedVersion)
    }
  }, [isOnWhatsNew, lastSeenVersion, installedVersion, setLastSeenVersion])

  return lastSeenVersion !== installedVersion && !isOnWhatsNew
}

/**
 * Moves focus to the page heading and announces the new page title through a
 * polite live region whenever the pathname changes. The initial load is
 * skipped, and search or hash-param changes inside one route do not retrigger
 * because only the pathname is observed.
 * @param pathname The current router pathname.
 * @param title The localized page title for that pathname.
 * @returns A ref for the page `h1` and the text to render in the live region.
 */
function usePageChangeFocus(pathname: string, title: string) {
  const headingReference = useRef<HTMLHeadingElement>(null)
  const previousPathname = useRef(pathname)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname
    headingReference.current?.focus()
    setAnnouncement(title)
  }, [pathname, title])

  return { headingReference, announcement }
}

/**
 * The App's root layout: collapsible sidebar (offcanvas when narrow), a 48px
 * header with the page title, and a scrolling content area that renders the
 * active route.
 * @returns The shell wrapping the router outlet.
 */
export function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const autoExport = useAutoExportStatus()
  const isWhatsNewUnseen = useIsWhatsNewUnseen(pathname)
  const pageTitle = i18n.t(getTitleKey(pathname))
  const { headingReference, announcement } = usePageChangeFocus(
    pathname,
    pageTitle,
  )

  const statusByRoute: Record<string, { status: NavStatus; label?: string }> = {
    [APP_ROUTES.autoExport]: autoExport,
    [APP_ROUTES.whatsNew]: isWhatsNewUnseen
      ? { status: 'primary', label: i18n.t('shell_whatsNewUnseen') }
      : { status: 'none' },
  }

  return (
    <SidebarProvider className="h-svh">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="pointer-events-none"
                render={<div />}
              >
                <img
                  src={browser.runtime.getURL('/icons/48.png')}
                  alt=""
                  className="aspect-square size-8 rounded-lg"
                />
                <div className="grid flex-1 text-left leading-tight">
                  <Wordmark className="truncate text-sm" />
                  <span className="truncate text-xs text-muted-foreground">
                    {i18n.t('shell_version', [
                      browser.runtime.getManifest().version,
                    ])}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <nav aria-label={i18n.t('shell_navLabel')}>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    const title = i18n.t(item.titleKey)
                    const itemStatus = statusByRoute[item.route]
                    return (
                      <SidebarMenuItem key={item.route}>
                        <SidebarMenuButton
                          tooltip={title}
                          isActive={pathname === item.route}
                          render={<Link to={item.route} />}
                        >
                          <item.icon />
                          <span>{title}</span>
                        </SidebarMenuButton>
                        {itemStatus && itemStatus.status !== 'none' && (
                          <span
                            role="img"
                            aria-label={itemStatus.label}
                            data-status={itemStatus.status}
                            className={cn(
                              'pointer-events-none absolute top-1/2 right-2 size-2 -translate-y-1/2 rounded-full group-data-[collapsible=icon]:top-1.5 group-data-[collapsible=icon]:right-1.5 group-data-[collapsible=icon]:translate-y-0',
                              STATUS_DOT_CLASS[itemStatus.status],
                            )}
                          />
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger aria-label={i18n.t('shell_toggleSidebar')} />
          <h1
            ref={headingReference}
            tabIndex={-1}
            className="font-heading text-sm font-medium outline-none"
          >
            {pageTitle}
          </h1>
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>
        </header>
        <div data-app-scroll className="flex-1 overflow-auto p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
