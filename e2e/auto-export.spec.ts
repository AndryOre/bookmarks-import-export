/// <reference types="chrome" />
import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

const enabledConfig = {
  enabled: true,
  interval: '1d',
  preferredTime: '09:30',
  dayOfWeek: 1,
  path: 'bookmarks-backup/',
  formats: ['html'],
  keepLast: 10,
}

const disabledConfig = { ...enabledConfig, enabled: false }

test('deep link #/auto-export shows the page, off state disables the controls', async ({
  openExtensionPage,
  seedStorage,
}) => {
  await seedStorage({
    autoExportConfig: disabledConfig,
    autoExportNextRun: null,
    autoExportLastRun: null,
  })

  const page = await openExtensionPage('app.html#/auto-export')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: en.shell_navAutoExport.message,
    }),
  ).toBeVisible()
  await expect(page.getByText(en.autoExportNeverRun.message)).toBeVisible()
  await expect(
    page.getByText(en.autoExportPage_off.message, { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: en.autoExportPage_interval3d.message }),
  ).toBeDisabled()
  await expect(page.getByLabel(en.exportPath.message)).toBeDisabled()
  await expect(page.getByRole('button', { name: 'JSON' })).toBeDisabled()
})

test('every control persists on change and re-arms the alarm', async ({
  openExtensionPage,
  seedStorage,
  serviceWorker,
}) => {
  await seedStorage({
    autoExportConfig: disabledConfig,
    autoExportNextRun: null,
    autoExportLastRun: null,
  })
  const page = await openExtensionPage('app.html#/auto-export')

  const readField = (field: string) =>
    serviceWorker.evaluate(async (key: string) => {
      const stored = await chrome.storage.local.get('autoExportConfig')
      const config = stored.autoExportConfig as Record<string, unknown>
      return config[key]
    }, field)

  await page.getByRole('switch', { name: en.enableAutoExport.message }).click()
  await expect(
    page.getByText(en.autoExportPage_saved.message, { exact: true }),
  ).toBeVisible()
  await expect.poll(() => readField('enabled')).toBe(true)
  await expect
    .poll(() =>
      serviceWorker.evaluate(async () => {
        const alarm = await chrome.alarms.get('auto-export')
        return alarm !== undefined
      }),
    )
    .toBe(true)

  await page
    .getByRole('button', { name: en.autoExportPage_interval3d.message })
    .click()
  await expect.poll(() => readField('interval')).toBe('3d')

  await page.getByRole('button', { name: 'JSON' }).click()
  await expect.poll(() => readField('formats')).toEqual(['html', 'json'])

  for (const name of ['Markdown', 'OPML', 'XBEL']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect
    .poll(() => readField('formats'))
    .toEqual(['html', 'json', 'markdown', 'opml', 'xbel'])

  const folder = page.getByLabel(en.exportPath.message)
  await folder.fill('my-backups/')
  await folder.blur()
  await expect.poll(() => readField('path')).toBe('my-backups/')

  await page
    .getByRole('button', { name: en.autoExportPage_interval12h.message })
    .click()
  await expect.poll(() => readField('interval')).toBe('12h')
  await expect(
    page.getByText(en.timeSelectionUnavailable.message),
  ).toBeVisible()
})

test('hourly disables the time, weekly reveals the day select, both save on change', async ({
  openExtensionPage,
  seedStorage,
  serviceWorker,
}) => {
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: null,
  })
  const page = await openExtensionPage('app.html#/auto-export')

  const readField = (field: string) =>
    serviceWorker.evaluate(async (key: string) => {
      const stored = await chrome.storage.local.get('autoExportConfig')
      const config = stored.autoExportConfig as Record<string, unknown>
      return config[key]
    }, field)

  await expect(
    page.getByLabel(en.autoExportPage_dayOfWeek.message),
  ).toHaveCount(0)

  await page
    .getByRole('button', { name: en.autoExportPage_interval1h.message })
    .click()
  await expect.poll(() => readField('interval')).toBe('1h')
  await expect(
    page.getByText(en.timeSelectionUnavailable.message),
  ).toBeVisible()

  await page
    .getByRole('button', { name: en.autoExportPage_interval7d.message })
    .click()
  await expect.poll(() => readField('interval')).toBe('7d')
  await expect(page.getByText(en.timeSelectionUnavailable.message)).toHaveCount(
    0,
  )

  await page.locator('#auto-export-day').click()
  await page
    .getByRole('option', { name: en.autoExportPage_day5.message })
    .click()
  await expect.poll(() => readField('dayOfWeek')).toBe(5)
})

test('the last selected format cannot be turned off', async ({
  openExtensionPage,
  seedStorage,
  serviceWorker,
}) => {
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: null,
  })
  const page = await openExtensionPage('app.html#/auto-export')

  const html = page.getByRole('button', { name: 'HTML' })
  await expect(html).toHaveAttribute('aria-pressed', 'true')
  await html.click()
  await expect(html).toHaveAttribute('aria-pressed', 'true')

  const formats = await serviceWorker.evaluate(async () => {
    const stored = await chrome.storage.local.get('autoExportConfig')
    return (stored.autoExportConfig as { formats: string[] }).formats
  })
  expect(formats).toEqual(['html'])
})

test('a failed last run shows its error', async ({
  openExtensionPage,
  seedStorage,
}) => {
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: {
      at: Date.now() - 60_000,
      ok: false,
      error: 'Disk is full',
      trigger: 'scheduled',
    },
  })
  const page = await openExtensionPage('app.html#/auto-export')

  await expect(
    page.getByRole('alert').filter({ hasText: 'Disk is full' }),
  ).toBeVisible()
  await expect(
    page.getByText(en.autoExportPage_failed.message, { exact: true }),
  ).toBeVisible()
})

test('Export now runs with the on-screen settings and updates the last run', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await seedBookmarks([
    { title: 'Auto Export Bookmark', url: 'https://auto-export.example.com/' },
  ])
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: null,
  })
  const page = await openExtensionPage('app.html#/auto-export')

  await page.getByRole('button', { name: en.exportNow.message }).click()

  await expect(page.getByText(en.exportNowSuccess.message)).toBeVisible({
    timeout: 30_000,
  })
  await expect(
    page.getByText(en.autoExportPage_succeeded.message, { exact: true }),
  ).toBeVisible()
})

test('the retention field saves on change and rejects anything but an integer >= 0', async ({
  openExtensionPage,
  seedStorage,
  serviceWorker,
}) => {
  await seedStorage({
    autoExportConfig: enabledConfig,
    autoExportNextRun: Date.now() + 60 * 60 * 1000,
    autoExportLastRun: null,
  })
  const page = await openExtensionPage('app.html#/auto-export')

  const readKeepLast = () =>
    serviceWorker.evaluate(async () => {
      const stored = await chrome.storage.local.get('autoExportConfig')
      return (stored.autoExportConfig as { keepLast: number }).keepLast
    })

  const keepLast = page.getByLabel(en.autoExportPage_keepLast.message)
  await expect(keepLast).toHaveValue('10')
  await expect(
    page.getByText(en.autoExportPage_keepLastDescription.message),
  ).toBeVisible()

  await keepLast.fill('3')
  await keepLast.blur()
  await expect.poll(readKeepLast).toBe(3)
  await expect(
    page.getByText(en.autoExportPage_saved.message, { exact: true }),
  ).toBeVisible()

  await keepLast.fill('-2')
  await expect(
    page.getByText(en.autoExportPage_keepLastInvalid.message),
  ).toBeVisible()
  await keepLast.blur()
  await expect(keepLast).toHaveValue('3')
  await expect.poll(readKeepLast).toBe(3)

  await keepLast.fill('1.5')
  await expect(
    page.getByText(en.autoExportPage_keepLastInvalid.message),
  ).toBeVisible()
  await keepLast.blur()
  await expect.poll(readKeepLast).toBe(3)

  await keepLast.fill('0')
  await keepLast.blur()
  await expect.poll(readKeepLast).toBe(0)
})
