import { APP_ROUTES, getAppUrl } from './app-url'

/**
 * Resolves where a legacy v1 page URL should land in the App. The v1 deep
 * link `?settings=auto-export` always maps to the Auto-export route.
 * See `docs/adr/0007-legacy-page-redirects.md`, the single exception to
 * ADR 0006.
 * @param route The App route that replaces the legacy page.
 * @param search The legacy page's `location.search`.
 * @returns The extension-internal App URL to navigate to.
 */
export function getLegacyRedirectUrl(route: string, search: string): string {
  const isAutoExportDeepLink =
    new URLSearchParams(search).get('settings') === 'auto-export'
  return getAppUrl(isAutoExportDeepLink ? APP_ROUTES.autoExport : route)
}

/**
 * Replaces the current legacy page with its App route, so the legacy URL does
 * not stay in history. Shared by the four legacy entrypoints (ADR 0007).
 * @param route The App route that replaces the legacy page.
 */
export function redirectToApp(route: string): void {
  location.replace(getLegacyRedirectUrl(route, location.search))
}
