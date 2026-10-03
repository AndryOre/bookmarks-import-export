import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

const ROUTES = [
  { hash: 'export', title: en.shell_navExport.message },
  { hash: 'settings', title: en.shell_navSettings.message },
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
    await expect(page.getByText(stubTexts[route.hash] ?? '')).toBeVisible()
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
    lastSeenVersion: '0.0.0',
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

test('moves focus to the page heading and announces it on navigation', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html')
  const nav = page.getByRole('navigation', {
    name: en.shell_navLabel.message,
  })
  const liveRegion = page.locator('[role="status"][aria-live="polite"]')
  await expect(liveRegion).toHaveText('')

  const titles = [
    en.shell_navImport.message,
    en.shell_navDuplicates.message,
    en.shell_navAutoExport.message,
    en.shell_navSettings.message,
    en.shell_navWhatsNew.message,
    en.shell_navExport.message,
  ]
  for (const title of titles) {
    await nav.getByRole('link', { name: title, exact: true }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeFocused()
    await expect(liveRegion).toHaveText(title)
  }
})

test('does not move focus on search changes inside the same route', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/export')
  const heading = page.getByRole('heading', {
    level: 1,
    name: en.shell_navExport.message,
  })
  await expect(heading).toBeVisible()
  await page.locator('body').click()
  await page.goto(page.url().replace(/#.*$/, '#/export?q=abc'))
  await expect(page).toHaveURL(/#\/export\?q=abc$/)
  await expect(heading).not.toBeFocused()
})
