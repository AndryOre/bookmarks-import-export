import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  redirect,
  RouterProvider,
} from '@tanstack/react-router'

import { APP_ROUTES } from '@/lib/app-url'

import { AppShell } from './app-shell'
import { AutoExportRoute } from './routes/auto-export'
import { DuplicatesRoute } from './routes/duplicates'
import { ExportRoute } from './routes/export'
import { ImportRoute } from './routes/import'
import { SettingsRoute } from './routes/settings'
import { WelcomeRoute } from './routes/welcome'
import { WhatsNewRoute } from './routes/whats-new'

/**
 * Sends any unknown hash route to the Export page so the page content and the
 * header title agree.
 * @returns A replace-navigation to the Export route.
 */
function RedirectToExport() {
  return <Navigate to={APP_ROUTES.export} replace />
}

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: RedirectToExport,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: APP_ROUTES.export, replace: true })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.export,
    component: ExportRoute,
    validateSearch: (search: Record<string, unknown>): { q?: string } => ({
      q: typeof search.q === 'string' && search.q !== '' ? search.q : undefined,
    }),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.import,
    component: ImportRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.duplicates,
    component: DuplicatesRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.autoExport,
    component: AutoExportRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.settings,
    component: SettingsRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.whatsNew,
    component: WhatsNewRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: APP_ROUTES.welcome,
    component: WelcomeRoute,
  }),
])

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  scrollRestoration: true,
  scrollToTopSelectors: ['[data-app-scroll]'],
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/**
 * Mounts the hash-routed App. Content scrolls inside `[data-app-scroll]`, so
 * that element is registered for scroll-to-top on navigation.
 * @returns The router provider.
 */
export function AppRouter() {
  return <RouterProvider router={router} />
}
