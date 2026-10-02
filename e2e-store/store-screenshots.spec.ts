import { chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from '../e2e/fixtures'
import type { SeedBookmark } from '../e2e/fixtures'
import messages from '../locales/en.json' with { type: 'json' }
import { composeLocalSlide, composeUiSlide } from './compose-slide'

const SCREENSHOTS_DIRECTORY = path.resolve('docs/store/assets/screenshots')
const RAW_DIRECTORY = path.resolve('test-results/store/raw')
const DEVICE_SCALE_FACTOR = 2
const APP_CAPTURE = { width: 1280, height: 716 }
const CANVAS = { width: 1280, height: 800 }
const CARD_WIDTH = 1040
const CARD_TOP = 220
const POPUP_CARD_TOP = 240
const POPUP_HEIGHT = 520

const SEED_BOOKMARKS: SeedBookmark[] = [
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
]

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

async function captureRaw(
  page: Page,
  selector: string,
  fileName: string,
): Promise<Buffer> {
  await mkdir(RAW_DIRECTORY, { recursive: true })
  return page.locator(selector).screenshot({
    animations: 'disabled',
    omitBackground: true,
    path: path.join(RAW_DIRECTORY, fileName),
    scale: 'device',
  })
}

test.use({
  colorScheme: 'dark',
  deviceScaleFactor: DEVICE_SCALE_FACTOR,
  viewport: APP_CAPTURE,
})

test('composes the five store screenshots', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}) => {
  await mkdir(SCREENSHOTS_DIRECTORY, { recursive: true })
  const composerBrowser = await chromium.launch({ channel: 'chromium' })
  const composer = await composerBrowser.newPage({
    viewport: CANVAS,
    deviceScaleFactor: 1,
  })
  const outputPath = (fileName: string): string =>
    path.join(SCREENSHOTS_DIRECTORY, fileName)

  await seedStorage({ theme: 'dark' })
  await seedBookmarks(SEED_BOOKMARKS)

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
  await exportPage.getByRole('checkbox', { name: 'Development' }).check()
  await expect(exportPage.locator('html.dark')).toHaveCount(1)
  const exportShot = await captureRaw(exportPage, 'body', '01-export.png')
  await composeUiSlide(
    composer,
    {
      headline: 'Export exactly what you choose',
      subtitle: 'One folder or everything — as HTML, JSON, or CSV.',
      screenshot: exportShot,
      cardWidth: CARD_WIDTH,
      cardTop: CARD_TOP,
    },
    outputPath('01-export.png'),
  )

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
  const importShot = await captureRaw(importPage, 'body', '02-import.png')
  await composeUiSlide(
    composer,
    {
      headline: 'Preview every import first',
      subtitle: 'Then merge, replace, or drop it into a new folder.',
      screenshot: importShot,
      cardWidth: CARD_WIDTH,
      cardTop: CARD_TOP,
    },
    outputPath('02-import.png'),
  )

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
  await expect(autoExportPage.getByRole('switch').first()).toBeChecked()
  const autoExportShot = await captureRaw(
    autoExportPage,
    'body',
    '03-auto-export.png',
  )
  await composeUiSlide(
    composer,
    {
      headline: 'Scheduled backups, hands-free',
      subtitle: 'Daily or weekly, straight to your Downloads folder.',
      screenshot: autoExportShot,
      cardWidth: CARD_WIDTH,
      cardTop: CARD_TOP,
    },
    outputPath('03-auto-export.png'),
  )

  const popup = await openExtensionPage('popup.html')
  await expect(popup.getByTestId('popup-frame')).toBeVisible()
  await popup.addStyleTag({
    content: `
      html, body { background: transparent !important; }
      [data-testid="popup-frame"] { background: var(--popover); border-radius: 16px; }
    `,
  })
  const popupShot = await captureRaw(
    popup,
    '[data-testid="popup-frame"]',
    '04-popup.png',
  )
  const popupBox = await popup.getByTestId('popup-frame').boundingBox()
  if (!popupBox) throw new Error('The popup frame has no bounding box')
  await composeUiSlide(
    composer,
    {
      headline: 'Export everything in one click',
      subtitle: 'Right from the toolbar.',
      screenshot: popupShot,
      cardWidth: Math.round((popupBox.width * POPUP_HEIGHT) / popupBox.height),
      cardTop: POPUP_CARD_TOP,
      cardHeight: POPUP_HEIGHT,
    },
    outputPath('04-popup.png'),
  )

  await composeLocalSlide(
    composer,
    { headline: 'Everything stays on your device' },
    [
      { icon: 'account', text: 'No account needed' },
      { icon: 'upload', text: 'Nothing is uploaded — no cloud, no server' },
      { icon: 'tracking', text: 'No analytics or tracking' },
      { icon: 'source', text: 'Open source on GitHub' },
    ],
    outputPath('05-local.png'),
  )
  await composerBrowser.close()
})
