import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

const seed: SeedBookmark[] = [
  { title: 'Status Line Bookmark', url: 'https://status-line.example.com/' },
]

const enabledConfig = {
  enabled: true,
  interval: '1d',
  preferredTime: '00:00',
  path: 'bookmarks-backup/',
  formats: ['html'],
}

const disabledConfig = { ...enabledConfig, enabled: false }

test('popup footer shows the next scheduled run when auto-export is enabled', async ({
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
  const statusLine = popup.getByRole('button', { name: /Auto-export: next/ })

  await expect(statusLine).toBeVisible()
})

test('popup footer shows disabled status when auto-export is off', async ({
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
    popup.getByRole('button', { name: 'Auto-export disabled · Configure' }),
  ).toBeVisible()
})

test('popup footer shows a failure status when the last auto-export run failed, even if enabled', async ({
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
    popup.getByRole('button', { name: 'Last auto-export failed' }),
  ).toBeVisible()
})

test('clicking the status line opens the Auto Export settings tab', async ({
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
  await popup
    .getByRole('button', { name: 'Auto-export disabled · Configure' })
    .click()
  const newTab = await newTabPromise
  await newTab.waitForLoadState()

  expect(newTab.url()).toMatch(/advanced-export\.html\?settings=auto-export$/)
})

test('popup stays within its 240x256 frame with no overflow in every status state', async ({
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
    popup.getByRole('button', { name: 'Last auto-export failed' }),
  ).toBeVisible()

  const { scrollWidth, scrollHeight, clientWidth, clientHeight } = await popup
    .getByTestId('popup-frame')
    .evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    }))

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight)
  expect(clientWidth).toBeLessThanOrEqual(240)
  expect(clientHeight).toBeLessThanOrEqual(256)
})
