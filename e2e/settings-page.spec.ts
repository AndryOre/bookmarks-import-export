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
