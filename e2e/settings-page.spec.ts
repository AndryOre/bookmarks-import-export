import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

test('theme choice applies live, persists across reloads and reaches the popup', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/settings')
  const html = page.locator('html')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html).toHaveClass(/dark/)

  await page
    .getByRole('button', { name: en.settingsPage_themeLight.message })
    .click()
  await expect(html).toHaveClass(/light/)

  await page.reload()
  await expect(html).toHaveClass(/light/)
  await expect(
    page.getByRole('button', { name: en.settingsPage_themeLight.message }),
  ).toHaveAttribute('aria-pressed', 'true')

  const popup = await openExtensionPage('popup.html')
  await expect(popup.locator('html')).toHaveClass(/light/)

  await page
    .getByRole('button', { name: en.settingsPage_themeSystem.message })
    .click()
  await expect(html).toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html).toHaveClass(/light/)
})

test('saved dark theme is on the root at first paint, before React mounts', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/settings')
  await page
    .getByRole('button', { name: en.settingsPage_themeDark.message })
    .click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: 'light' })

  await page.addInitScript(() => {
    const root = document.documentElement
    new MutationObserver(() => {
      root.dataset.themeLog = `${root.dataset.themeLog ?? ''}|${root.className}`
    }).observe(root, { attributes: true, attributeFilter: ['class'] })
  })
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)

  const classLog = await page.locator('html').getAttribute('data-theme-log')
  expect(classLog ?? '').not.toContain('light')
})

test('display switches persist across reloads', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/settings')
  const iconSwitch = page.getByRole('switch', {
    name: en.showBookmarkIcon.message,
  })
  const expandSwitch = page.getByRole('switch', {
    name: en.autoExpandFolders.message,
  })

  await expect(iconSwitch).toBeChecked()
  await expect(expandSwitch).not.toBeChecked()

  await iconSwitch.click()
  await expandSwitch.click()
  await page.reload()

  await expect(iconSwitch).not.toBeChecked()
  await expect(expandSwitch).toBeChecked()
})

test('default import mode persists and is shown in the popup', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/settings')

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: en.importModeFolder.message }).click()
  await page.reload()

  await expect(page.getByRole('combobox')).toContainText(
    en.importModeFolder.message,
  )

  const popup = await openExtensionPage('popup.html')
  await expect(popup.getByRole('combobox')).toContainText(
    en.importModeFolder.message,
  )
})
