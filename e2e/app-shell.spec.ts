import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

const ROUTES = [
  { hash: 'export', title: en.shell_navExport.message },
  { hash: 'settings', title: en.shell_navSettings.message },
  { hash: 'whats-new', title: en.shell_navWhatsNew.message },
  { hash: 'welcome', title: en.shell_titleWelcome.message },
]

test('app.html lands on Export', async ({ openExtensionPage }) => {
  const page = await openExtensionPage('app.html')

  await expect(page).toHaveURL(/app\.html#\/export$/)
  await expect(
    page.getByRole('heading', { level: 1, name: en.shell_navExport.message }),
  ).toBeVisible()
})

for (const route of ROUTES) {
  test(`renders the ${route.hash} stub from a direct hash URL`, async ({
    openExtensionPage,
  }) => {
    const page = await openExtensionPage(`app.html#/${route.hash}`)

    await expect(
      page.getByRole('heading', { level: 1, name: route.title }),
    ).toBeVisible()
    const stubTexts: Record<string, string> = {
      export: en.exportOptions_title.message,
      settings: en.settingsPage_appearanceTitle.message,
    }
    await expect(
      page.getByText(stubTexts[route.hash] ?? en.shell_placeholder.message),
    ).toBeVisible()
  })
}

test('navigates between routes via the sidebar', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html')
  const nav = page.getByRole('navigation', {
    name: en.shell_navLabel.message,
  })

  await nav.getByRole('link', { name: en.shell_navAutoExport.message }).click()

  await expect(page).toHaveURL(/#\/auto-export$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: en.shell_navAutoExport.message,
    }),
  ).toBeVisible()
  await expect(
    nav.getByRole('link', { name: en.shell_navAutoExport.message }),
  ).toHaveAttribute('aria-current', 'page')
})

test('collapses and expands the sidebar', async ({ openExtensionPage }) => {
  const page = await openExtensionPage('app.html')
  const sidebar = page.locator('[data-slot="sidebar"]').first()
  const trigger = page.getByRole('button', {
    name: en.shell_toggleSidebar.message,
    exact: true,
  })

  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
  await trigger.click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await trigger.click()
  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
})

test('uses an offcanvas sheet at narrow width', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html')
  await page.setViewportSize({ width: 600, height: 800 })

  const nav = page.getByRole('navigation', {
    name: en.shell_navLabel.message,
  })
  await expect(nav).toBeHidden()

  await page
    .getByRole('button', { name: en.shell_toggleSidebar.message })
    .click()

  await expect(nav).toBeVisible()
  await nav.getByRole('link', { name: en.shell_navSettings.message }).click()
  await expect(page).toHaveURL(/#\/settings$/)
})

test('shows status dots for auto-export and unseen version', async ({
  openExtensionPage,
  seedStorage,
}) => {
  await seedStorage({
    autoExportConfig: {
      enabled: true,
      interval: '1d',
      preferredTime: '00:00',
      path: 'bookmarks-backup/',
      formats: ['html'],
    },
  })
  const page = await openExtensionPage('app.html')

  await expect(
    page.getByRole('img', { name: en.shell_autoExportOn.message }),
  ).toBeVisible()
  await expect(
    page.getByRole('img', { name: en.shell_whatsNewUnseen.message }),
  ).toBeVisible()

  await page.getByRole('link', { name: en.shell_navWhatsNew.message }).click()
  await expect(
    page.getByRole('img', { name: en.shell_whatsNewUnseen.message }),
  ).toBeHidden()
})

test('mounts the toast viewport on every route', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/settings')

  await expect(page.locator('[data-slot="toast-viewport"]')).toBeAttached()
  await page.getByRole('link', { name: en.shell_navImport.message }).click()
  await expect(page.locator('[data-slot="toast-viewport"]')).toBeAttached()
})
