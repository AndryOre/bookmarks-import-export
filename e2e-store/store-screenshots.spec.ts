import { chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from '../e2e/fixtures'
import type { SeedBookmark } from '../e2e/fixtures'
import { STORE_CAPTIONS } from './captions'
import { composeLocalSlide, composeUiSlide } from './compose-slide'

const SCREENSHOTS_ROOT = path.resolve('docs/store/assets/screenshots')
const DEFAULT_LOCALE = 'en'
const SLIDE_FILES = [
  '01-export.png',
  '02-import.png',
  '03-auto-export.png',
  '04-popup.png',
  '05-local.png',
]
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

async function readMessages(
  locale: string,
): Promise<Record<string, { message: string }>> {
  const raw = await readFile(path.resolve('locales', `${locale}.json`), 'utf8')
  return JSON.parse(raw) as Record<string, { message: string }>
}

test('composes the five store screenshots', async ({
  openExtensionPage,
  seedBookmarks,
  seedStorage,
}, testInfo) => {
  const locale = testInfo.project.name
  const captions = STORE_CAPTIONS[locale]
  if (!captions) throw new Error(`No store captions for locale ${locale}`)
  const messages = await readMessages(locale)
  const message = (key: string): string => {
    const entry = messages[key]
    if (!entry) throw new Error(`Missing ${key} in locales/${locale}.json`)
    return entry.message
  }
  const localeDirectory = path.join(SCREENSHOTS_ROOT, locale)
  await mkdir(localeDirectory, { recursive: true })
  if (locale === DEFAULT_LOCALE)
    await mkdir(SCREENSHOTS_ROOT, { recursive: true })
  const composerBrowser = await chromium.launch({ channel: 'chromium' })
  const composer = await composerBrowser.newPage({
    viewport: CANVAS,
    deviceScaleFactor: 1,
  })
  const outputPath = (fileName: string): string =>
    path.join(localeDirectory, fileName)

  await seedStorage({ theme: 'dark' })
  await seedBookmarks(SEED_BOOKMARKS)

  const exportPage = await openExtensionPage('app.html#/export')
  await expect(
    exportPage.getByRole('heading', {
      level: 1,
      name: message('shell_navExport'),
    }),
  ).toBeVisible()
  await exportPage
    .getByRole('button', { name: message('exportPage_expandAll') })
    .click()
  await exportPage
    .getByRole('treeitem', { name: 'Development', exact: true })
    .focus()
  await exportPage.keyboard.press('Space')
  await expect(exportPage.locator('html.dark')).toHaveCount(1)
  const exportShot = await captureRaw(exportPage, 'body', '01-export.png')
  await composeUiSlide(
    composer,
    {
      ...captions.export,
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
      name: message('shell_navImport'),
    }),
  ).toBeVisible()
  await importPage.getByLabel(message('import_fileInputLabel')).setInputFiles({
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
      ...captions.import,
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
      dayOfWeek: 1,
      path: 'bookmarks-backup/',
      formats: ['html', 'json', 'markdown'],
      keepLast: 10,
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
      name: message('shell_navAutoExport'),
    }),
  ).toBeVisible()
  await expect(
    autoExportPage.getByText(message('autoExportPage_nextRun')),
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
      ...captions.autoExport,
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
      ...captions.popup,
      screenshot: popupShot,
      cardWidth: Math.round((popupBox.width * POPUP_HEIGHT) / popupBox.height),
      cardTop: POPUP_CARD_TOP,
      cardHeight: POPUP_HEIGHT,
    },
    outputPath('04-popup.png'),
  )

  await composeLocalSlide(
    composer,
    { headline: captions.local.headline },
    [
      { icon: 'account', text: captions.local.claims[0] },
      { icon: 'upload', text: captions.local.claims[1] },
      { icon: 'tracking', text: captions.local.claims[2] },
      { icon: 'source', text: captions.local.claims[3] },
    ],
    outputPath('05-local.png'),
  )
  await composerBrowser.close()
  if (locale === DEFAULT_LOCALE) {
    for (const fileName of SLIDE_FILES)
      await copyFile(
        path.join(localeDirectory, fileName),
        path.join(SCREENSHOTS_ROOT, fileName),
      )
  }
})
