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
  { format: 'HTML' },
  { format: 'JSON' },
  { format: 'CSV' },
] as const

for (const { format } of cases) {
  test(`exports the seeded bookmarks as ${format} from the popup`, async ({
    openExtensionPage,
    seedBookmarks,
  }) => {
    await seedBookmarks(seed)

    const popup = await openExtensionPage('popup.html')

    if (format !== 'HTML') {
      await popup.getByRole('combobox').click()
      await popup.getByRole('option', { name: format }).click()
    }

    const downloadPromise = popup.waitForEvent('download')
    await popup.getByRole('button', { name: 'Export format' }).click()
    const download = await downloadPromise

    const downloadPath = await download.path()
    if (!downloadPath) {
      throw new Error('Expected the export download to save to a file path')
    }
    const content = await readFile(downloadPath, 'utf8')

    expect(content).toContain('Popup Export Bookmark')
    expect(content).toContain('https://popup-export.example.com/')
  })
}
