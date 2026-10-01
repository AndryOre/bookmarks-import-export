import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

const seed: SeedBookmark[] = [
  { title: 'Status Item Bookmark', url: 'https://status-item.example.com/' },
]

const enabledConfig = {
  enabled: true,
  interval: '1d',
  preferredTime: '00:00',
  path: 'bookmarks-backup/',
  formats: ['html'],
}

const disabledConfig = { ...enabledConfig, enabled: false }

test('popup status shows the next scheduled run when auto-export is enabled', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await seedBookmarks(seed)
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: null,
  })

  const popup = await openExtensionPage('popup.html')

  await expect(
    popup.getByRole('link', { name: /Next auto-export/ }),
  ).toBeVisible()
})

test('popup status invites setting up scheduled backups when auto-export is off', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await seedBookmarks(seed)
  await seedStorage({
    autoExportConfig: disabledConfig,
    autoExportNextRun: null,
    autoExportLastRun: null,
  })

  const popup = await openExtensionPage('popup.html')

  await expect(
    popup.getByRole('link', { name: /Set up scheduled backups/ }),
  ).toBeVisible()
})

test('popup status shows a failure when the last auto-export run failed, even if enabled', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await seedBookmarks(seed)
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: {
      at: Date.now() - 60 * 60 * 1000,
      ok: false,
      error: 'Download failed',
      trigger: 'scheduled',
    },
  })

  const popup = await openExtensionPage('popup.html')

  await expect(
    popup.getByRole('link', { name: /Last auto-export failed/ }),
  ).toBeVisible()
})

test('clicking the status item opens the Auto-export route in a new tab', async ({
  context,
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await seedBookmarks(seed)
  await seedStorage({
    autoExportConfig: disabledConfig,
    autoExportNextRun: null,
    autoExportLastRun: null,
  })

  const popup = await openExtensionPage('popup.html')

  const newTabPromise = context.waitForEvent('page')
  await popup.getByRole('link', { name: /Set up scheduled backups/ }).click()
  const newTab = await newTabPromise
  await newTab.waitForLoadState()

  expect(newTab.url()).toMatch(/app\.html#\/auto-export$/)
})

test('footer buttons open the app and its settings route', async ({
  context,
  openExtensionPage,
}) => {
  const popup = await openExtensionPage('popup.html')

  const settingsTabPromise = context.waitForEvent('page')
  await popup.getByRole('button', { name: 'Settings' }).click()
  const settingsTab = await settingsTabPromise
  await settingsTab.waitForLoadState()
  expect(settingsTab.url()).toMatch(/app\.html#\/settings$/)

  const appTabPromise = context.waitForEvent('page')
  await popup.getByRole('button', { name: 'Open app' }).click()
  const appTab = await appTabPromise
  await appTab.waitForLoadState()
  expect(appTab.url()).toMatch(/app\.html#\//)
})

test('popup is 320px wide with no horizontal overflow in the failed state', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await seedBookmarks(seed)
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: {
      at: Date.now() - 60 * 60 * 1000,
      ok: false,
      error: 'Download failed',
      trigger: 'scheduled',
    },
  })

  const popup = await openExtensionPage('popup.html')
  await expect(
    popup.getByRole('link', { name: /Last auto-export failed/ }),
  ).toBeVisible()

  const { scrollWidth, clientWidth } = await popup
    .getByTestId('popup-frame')
    .evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }))

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  expect(clientWidth).toBe(320)
})
