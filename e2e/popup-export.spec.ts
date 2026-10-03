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
  { format: 'HTML', extension: '.html' },
  { format: 'JSON', extension: '.json' },
  { format: 'CSV', extension: '.csv' },
] as const

for (const { format, extension } of cases) {
  test(`exports the seeded bookmarks as ${format} from the popup and shows a toast`, async ({
    openExtensionPage,
    seedBookmarks,
  }) => {
    await seedBookmarks(seed)

    const popup = await openExtensionPage('popup.html')
    await popup.getByRole('button', { name: format }).click()

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
  await firstPopup.getByRole('button', { name: 'JSON' }).click()
  await expect(
    firstPopup.getByRole('button', { name: 'JSON', pressed: true }),
  ).toBeVisible()
  await firstPopup.close()

  const secondPopup = await openExtensionPage('popup.html')
  await expect(
    secondPopup.getByRole('button', { name: 'JSON', pressed: true }),
  ).toBeVisible()

  const downloadPromise = secondPopup.waitForEvent('download')
  await secondPopup.getByRole('button', { name: 'Export all' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.json$/)
})
