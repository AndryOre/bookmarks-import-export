import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

test('opens the Welcome route inside the app on install', async ({
  context,
}) => {
  const welcomePage =
    context.pages().find((page) => page.url().includes('app.html#/welcome')) ??
    (await context.waitForEvent('page', {
      predicate: (page) => page.url().includes('app.html#/welcome'),
    }))

  await expect(
    welcomePage.getByRole('heading', {
      level: 1,
      name: en.shell_titleWelcome.message,
    }),
  ).toBeVisible()
  await expect(
    welcomePage.getByRole('heading', {
      level: 2,
      name: en.welcome_heroTitle.message,
    }),
  ).toBeVisible()
})

test('Welcome quick-start actions open Export, Auto-export and Import', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/welcome')
  const actions = [
    { name: en.welcome_exportAction.message, url: /#\/export$/ },
    { name: en.welcome_autoExportAction.message, url: /#\/auto-export$/ },
    { name: en.welcome_importAction.message, url: /#\/import$/ },
  ]

  for (const action of actions) {
    await page
      .getByRole('main')
      .getByRole('link', { name: action.name, exact: true })
      .click()
    await expect(page).toHaveURL(action.url)
    await page.goBack()
  }
})

test("What's new marks the Current version and links into the app", async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/whats-new')

  await expect(
    page.getByRole('heading', { level: 1, name: en.shell_navWhatsNew.message }),
  ).toBeVisible()
  await expect(page.getByText(en.whatsNew_current.message)).toHaveCount(1)
  await expect(
    page.getByRole('link', { name: en.whatsNew_reviewAction.message }),
  ).toBeVisible()

  await page
    .getByRole('link', { name: en.changelog_1_5_0_1_link.message })
    .click()
  await expect(page).toHaveURL(/app\.html#\/import$/)
})

test('toolbar action title is localized', async ({ serviceWorker }) => {
  const manifest = await serviceWorker.evaluate(() =>
    chrome.runtime.getManifest(),
  )

  expect(manifest.action?.default_title).toBe(en.extensionName.message)
})

test('App and popup pages are titled Snug', async ({ openExtensionPage }) => {
  const appPage = await openExtensionPage('app.html')
  await expect(appPage).toHaveTitle(en.extensionName.message)

  const popupPage = await openExtensionPage('popup.html')
  await expect(popupPage).toHaveTitle(en.extensionName.message)
})

test('legacy v1 pages redirect to their App routes', async ({
  openExtensionPage,
}) => {
  const legacyPages = [
    { path: 'advanced-export.html', hash: '#/export' },
    { path: 'advanced-import.html', hash: '#/import' },
    { path: 'welcome.html', hash: '#/welcome' },
    { path: 'update.html', hash: '#/whats-new' },
    {
      path: 'advanced-export.html?settings=auto-export',
      hash: '#/auto-export',
    },
  ]

  for (const legacyPage of legacyPages) {
    const page = await openExtensionPage(legacyPage.path)
    await expect(page).toHaveURL(
      new RegExp(String.raw`/app\.html${legacyPage.hash}$`),
    )
    await page.close()
  }
})
