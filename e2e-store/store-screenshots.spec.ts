import type { Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from '../e2e/fixtures'
import type { SeedBookmark } from '../e2e/fixtures'
import en from '../locales/en.json' with { type: 'json' }
import es from '../locales/es.json' with { type: 'json' }

const VIEWPORT = { width: 1280, height: 800 }
const SCREENSHOTS_DIRECTORY = path.resolve('docs/store/assets/screenshots')

const messagesByLocale = { en, es } as const
type StoreLocale = keyof typeof messagesByLocale

const seedByLocale: Record<StoreLocale, SeedBookmark[]> = {
  en: [
    {
      title: 'Development',
      children: [
        { title: 'GitHub', url: 'https://github.com/' },
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com/' },
        {
          title: 'Frameworks',
          children: [
            { title: 'React', url: 'https://react.dev/' },
            { title: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
          ],
        },
      ],
    },
    {
      title: 'Reading',
      children: [
        { title: 'Wikipedia', url: 'https://www.wikipedia.org/' },
        { title: 'Hacker News', url: 'https://news.ycombinator.com/' },
      ],
    },
    {
      title: 'Travel',
      children: [
        { title: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' },
        { title: 'Wikivoyage', url: 'https://www.wikivoyage.org/' },
      ],
    },
  ],
  es: [
    {
      title: 'Desarrollo',
      children: [
        { title: 'GitHub', url: 'https://github.com/' },
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/es/' },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com/' },
        {
          title: 'Frameworks',
          children: [
            { title: 'React', url: 'https://react.dev/' },
            { title: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
          ],
        },
      ],
    },
    {
      title: 'Lecturas',
      children: [
        { title: 'Wikipedia', url: 'https://es.wikipedia.org/' },
        { title: 'Hacker News', url: 'https://news.ycombinator.com/' },
      ],
    },
    {
      title: 'Viajes',
      children: [
        { title: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' },
        { title: 'Wikiviajes', url: 'https://es.wikivoyage.org/' },
      ],
    },
  ],
}

const selectedFolderByLocale: Record<StoreLocale, string> = {
  en: 'Development',
  es: 'Desarrollo',
}

const importFileHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
  <DL><p>
    <DT><A HREF="https://github.com/">GitHub</A>
    <DT><A HREF="https://developer.mozilla.org/">MDN Web Docs</A>
    <DT><A HREF="https://www.wikipedia.org/">Wikipedia</A>
  </DL><p>
  <DT><H3>Other bookmarks</H3>
  <DL><p>
    <DT><A HREF="https://news.ycombinator.com/">Hacker News</A>
    <DT><A HREF="https://www.openstreetmap.org/">OpenStreetMap</A>
  </DL><p>
</DL><p>
`

async function capture(
  page: Page,
  locale: StoreLocale,
  fileName: string,
): Promise<void> {
  await mkdir(path.join(SCREENSHOTS_DIRECTORY, locale), { recursive: true })
  await page.screenshot({
    animations: 'disabled',
    path: path.join(SCREENSHOTS_DIRECTORY, locale, fileName),
  })
}

test.use({ viewport: VIEWPORT, colorScheme: 'dark' })

test('captures the five store screenshots', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}, testInfo) => {
  const locale = testInfo.project.name as StoreLocale
  const messages = messagesByLocale[locale]
  await seedStorage({ theme: 'dark' })
  await seedBookmarks(seedByLocale[locale])

  const exportPage = await openExtensionPage('app.html#/export')
  await expect(
    exportPage.getByRole('heading', {
      level: 1,
      name: messages.shell_navExport.message,
    }),
  ).toBeVisible()
  await exportPage
    .getByRole('button', { name: messages.exportPage_expandAll.message })
    .click()
  await exportPage
    .getByRole('checkbox', { name: selectedFolderByLocale[locale] })
    .check()
  await expect(exportPage.locator('html.dark')).toHaveCount(1)
  await capture(exportPage, locale, '01-export.png')

  const importPage = await openExtensionPage('app.html#/import')
  await expect(
    importPage.getByRole('heading', {
      level: 1,
      name: messages.shell_navImport.message,
    }),
  ).toBeVisible()
  await importPage
    .getByLabel(messages.import_fileInputLabel.message)
    .setInputFiles({
      name: 'bookmarks.html',
      mimeType: 'text/html',
      buffer: Buffer.from(importFileHtml),
    })
  await expect(importPage.getByRole('radio')).toHaveCount(3)
  await importPage.getByRole('radio').nth(1).click()
  await capture(importPage, locale, '02-import.png')

  const hourInMilliseconds = 60 * 60 * 1000
  await seedStorage({
    autoExportConfig: {
      enabled: true,
      interval: '1d',
      preferredTime: '09:30',
      path: 'bookmarks-backup/',
      formats: ['html', 'json'],
    },
    autoExportNextRun: Date.now() + 8 * hourInMilliseconds,
    autoExportLastRun: {
      at: Date.now() - 16 * hourInMilliseconds,
      ok: true,
      trigger: 'scheduled',
    },
  })
  const autoExportPage = await openExtensionPage('app.html#/auto-export')
  await expect(
    autoExportPage.getByRole('heading', {
      level: 1,
      name: messages.shell_navAutoExport.message,
    }),
  ).toBeVisible()
  await expect(
    autoExportPage.getByText(messages.autoExportPage_nextRun.message),
  ).toBeVisible()
  await expect(
    autoExportPage.getByText(messages.autoExportPage_off.message, {
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(autoExportPage.getByRole('switch').first()).toBeChecked()
  await capture(autoExportPage, locale, '03-auto-export.png')

  const popup = await openExtensionPage('popup.html')
  await expect(popup.getByTestId('popup-frame')).toBeVisible()
  await popup.addStyleTag({
    content: `
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: var(--background); }
      [data-testid="popup-frame"] { background: var(--popover); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 24px 64px rgb(0 0 0 / 0.45); }
    `,
  })
  await capture(popup, locale, '04-popup.png')

  const welcomePage = await openExtensionPage('app.html#/welcome')
  await expect(
    welcomePage.getByRole('heading', {
      level: 2,
      name: messages.welcome_heroTitle.message,
    }),
  ).toBeVisible()
  await capture(welcomePage, locale, '05-welcome.png')
})
