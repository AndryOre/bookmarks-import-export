import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

test('persists a toggle across reload and previews the filename template', async ({
  openExtensionPage,
}) => {
  const page = await openExtensionPage('app.html#/export')

  const dateLastUsed = page.getByRole('switch', {
    name: en.exportOptions_dateLastUsed.message,
  })
  await expect(dateLastUsed).not.toBeChecked()
  await dateLastUsed.click()
  await expect(dateLastUsed).toBeChecked()

  await page
    .getByRole('textbox', { name: en.exportFilenameTemplate.message })
    .fill('Backup %yyyy')
  const year = String(new Date().getFullYear())
  await expect(page.getByTestId('export-options-preview')).toContainText(
    `Backup ${year}`,
  )

  await page.reload()
  await expect(
    page.getByRole('switch', { name: en.exportOptions_dateLastUsed.message }),
  ).toBeChecked()
  await expect(
    page.getByRole('textbox', { name: en.exportFilenameTemplate.message }),
  ).toHaveValue('Backup %yyyy')
})
