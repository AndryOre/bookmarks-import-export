import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

test('opens the welcome page on install', async ({ context }) => {
  const welcomePage =
    context.pages().find((page) => page.url().includes('welcome.html')) ??
    (await context.waitForEvent('page', {
      predicate: (page) => page.url().includes('welcome.html'),
    }))

  await expect(
    welcomePage.getByRole('heading', { name: en.welcomeTitle.message }),
  ).toBeVisible()
})

test('renders the update page', async ({ openExtensionPage }) => {
  const updatePage = await openExtensionPage('update.html')

  await expect(
    updatePage.getByRole('heading', { name: en.extensionName.message }),
  ).toBeVisible()
  await expect(updatePage.getByText(/You're now using version/)).toBeVisible()
})

test('toolbar action title is localized', async ({ serviceWorker }) => {
  const manifest = await serviceWorker.evaluate(() =>
    chrome.runtime.getManifest(),
  )

  expect(manifest.action?.default_title).toBe('__MSG_extensionName__')
})
