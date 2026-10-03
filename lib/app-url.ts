/**
 * The App's route paths, shared by the router, the sidebar and every caller
 * that deep-links into the App (popup, background, changelog).
 */
export const APP_ROUTES = {
  export: '/export',
  import: '/import',
  duplicates: '/duplicates',
  autoExport: '/auto-export',
  settings: '/settings',
  whatsNew: '/whats-new',
  welcome: '/welcome',
} as const

/**
 * Builds the absolute URL of the full-page App (`app.html`) with a hash
 * route, e.g. `chrome-extension://<id>/app.html#/auto-export`. The App uses
 * hash history, so the route lives after the `#`.
 * @param route The in-app route path, with or without a leading slash.
 * @returns The extension-internal URL to open in a tab.
 */
export function getAppUrl(route: string = '/'): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  return `${browser.runtime.getURL('/app.html')}#${normalizedRoute}`
}
