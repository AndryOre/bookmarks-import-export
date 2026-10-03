import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

const seed: SeedBookmark[] = [
  {
    title: 'Popup Export Folder',
    children: [
      {
        title: 'Popup Export Bookmark',
        url: 'https://popup-export.example.com/',
      },
    ],
  },
]

const cases = [
  { format: 'HTML', extension: '.html', shape: '<DT><A HREF=' },
  { format: 'JSON', extension: '.json', shape: '"url"' },
  { format: 'CSV', extension: '.csv', shape: '"title","url","folder"' },
  {
    format: 'Markdown',
    extension: '.md',
    shape: '  - [Popup Export Bookmark](https://popup-export.example.com/)',
  },
  { format: 'OPML', extension: '.opml', shape: '<opml version="2.0">' },
  { format: 'XBEL', extension: '.xbel', shape: '<xbel version="1.0">' },
] as const

async function chooseFormat(popup: Page, format: string) {
  await popup.getByRole('combobox', { name: 'Export format' }).click()
  await popup.getByRole('option', { name: format, exact: true }).click()
}

for (const { format, extension, shape } of cases) {
  test(`exports the seeded bookmarks as ${format} from the popup and shows a toast`, async ({
    openExtensionPage,
    seedBookmarks,
  }) => {
    await seedBookmarks(seed)

    const popup = await openExtensionPage('popup.html')
    await chooseFormat(popup, format)

    const downloadPromise = popup.waitForEvent('download')
    await popup.getByRole('button', { name: 'Export all' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(
      new RegExp(`${extension.replace('.', String.raw`\.`)}$`),
    )
    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Expected the export download to save to a file path')
    }
    const content = await readFile(downloadPath, 'utf8')

    expect(content).toContain('Popup Export Bookmark')
    expect(content).toContain('https://popup-export.example.com/')
    expect(content).toContain(shape)

    await expect(popup.getByText(/Exported \d+ bookmarks?/)).toBeVisible()
    await expect(popup.getByText(extension, { exact: false })).toBeVisible()
  })
}

test('remembers the last chosen export format across popup opens', async ({
  openExtensionPage,
  seedBookmarks,
}) => {
  await seedBookmarks(seed)

  const firstPopup = await openExtensionPage('popup.html')
  await chooseFormat(firstPopup, 'OPML')
  await expect(
    firstPopup.getByRole('combobox', { name: 'Export format' }),
  ).toContainText('OPML')
  await firstPopup.close()

  const secondPopup = await openExtensionPage('popup.html')
  await expect(
    secondPopup.getByRole('combobox', { name: 'Export format' }),
  ).toContainText('OPML')

  const downloadPromise = secondPopup.waitForEvent('download')
  await secondPopup.getByRole('button', { name: 'Export all' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.opml$/)
})
