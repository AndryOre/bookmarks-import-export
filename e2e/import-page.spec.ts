import type { Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'

const FIXTURES_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

async function openImportPage(
  openExtensionPage: (pageName: string) => Promise<Page>,
): Promise<Page> {
  return openExtensionPage('app.html#/import')
}

async function chooseFile(page: Page, fileName: string): Promise<void> {
  await page
    .getByLabel(en.import_fileInputLabel.message)
    .setInputFiles(path.join(FIXTURES_DIRECTORY, fileName))
}

async function selectMode(page: Page, label: string): Promise<void> {
  await page.getByRole('radio', { name: new RegExp(`^${label}`) }).click()
}

async function submitImport(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: `Import ${count} bookmarks` }).click()
}

async function expectSuccess(page: Page): Promise<void> {
  await expect(
    page.getByText(en.bookmarksImportedSuccessfully.message),
  ).toBeVisible()
}

test.describe('Import page', () => {
  test('shows the empty drop zone first', async ({ openExtensionPage }) => {
    const page = await openImportPage(openExtensionPage)

    await expect(page.getByText(en.dropFileHere.message)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Import \d+/ })).toHaveCount(
      0,
    )
  })

  test('HTML preview lists per-root counts and enables restore modes', async ({
    openExtensionPage,
  }) => {
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.html')

    await expect(page.getByText('bookmarks.html')).toBeVisible()
    await expect(page.getByText('Bookmarks bar')).toBeVisible()
    await expect(page.getByText('2 bookmarks')).toBeVisible()
    await expect(page.getByText('Other bookmarks')).toBeVisible()
    await expect(page.getByText('1 bookmarks')).toBeVisible()
    await expect(
      page.getByRole('radio', { name: /^Restore — merge/ }),
    ).toBeEnabled()
    await expect(
      page.getByRole('radio', { name: /^Restore — replace/ }),
    ).toBeEnabled()
    await expect(
      page.getByRole('button', { name: 'Import 3 bookmarks' }),
    ).toBeVisible()
  })

  test('HTML folder mode imports into an "Imported bookmarks" folder', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      { title: 'Existing', url: 'https://existing-other.example/page' },
    ])
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.html')
    await selectMode(page, 'Create folder')
    await submitImport(page, 3)
    await expectSuccess(page)

    const [root] = await readBookmarkTree()
    const otherBookmarks = root?.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const importedBar = importedFolder?.children?.find(
      (n) => n.title === 'Bookmarks bar',
    )

    expect(importedBar?.children?.map((n) => n.url)).toEqual([
      'https://html-bar-a.example/page',
      'https://html-bar-b.example/page',
    ])
    expect(
      otherBookmarks?.children?.some(
        (n) => n.url === 'https://existing-other.example/page',
      ),
    ).toBe(true)
  })

  test('HTML restore-merge writes into the existing roots', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      { title: 'Existing', url: 'https://existing-other.example/page' },
    ])
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.html')
    await selectMode(page, 'Restore — merge')
    await submitImport(page, 3)
    await expectSuccess(page)

    const [root] = await readBookmarkTree()
    const bookmarksBar = root?.children?.find((n) => n.id === '1')
    const otherBookmarks = root?.children?.find((n) => n.id === '2')

    expect(bookmarksBar?.children?.map((n) => n.url)).toEqual([
      'https://html-bar-a.example/page',
      'https://html-bar-b.example/page',
    ])
    expect(otherBookmarks?.children?.map((n) => n.url)).toEqual(
      expect.arrayContaining([
        'https://existing-other.example/page',
        'https://html-other-a.example/page',
      ]),
    )
  })

  test('JSON restore-replace asks for confirmation and clears existing roots', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      { title: 'Existing', url: 'https://existing-other.example/page' },
    ])
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.json')
    await selectMode(page, 'Restore — replace')
    await submitImport(page, 4)

    await expect(
      page.getByRole('alertdialog', { name: en.import_replaceTitle.message }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: en.import_replaceConfirm.message })
      .click()
    await expectSuccess(page)

    const [root] = await readBookmarkTree()
    const bookmarksBar = root?.children?.find((n) => n.id === '1')
    const otherBookmarks = root?.children?.find((n) => n.id === '2')

    expect(bookmarksBar?.children?.map((n) => n.url)).toEqual([
      'https://json-bar-a.example/page',
    ])
    expect(otherBookmarks?.children?.map((n) => n.url)).toEqual([
      'https://json-other-a.example/page',
      'https://json-other-b.example/page',
    ])
  })

  test('cancelling the replace confirmation writes nothing', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      { title: 'Existing', url: 'https://existing-other.example/page' },
    ])
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.json')
    await selectMode(page, 'Restore — replace')
    await submitImport(page, 4)
    await page.getByRole('button', { name: en.cancel.message }).click()

    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(
      page.getByText(en.bookmarksImportedSuccessfully.message),
    ).toHaveCount(0)

    const [root] = await readBookmarkTree()
    const otherBookmarks = root?.children?.find((n) => n.id === '2')
    expect(otherBookmarks?.children?.map((n) => n.url)).toEqual([
      'https://existing-other.example/page',
    ])
  })

  test('CSV shows one row, disables restore modes with the reason, and imports in folder mode', async ({
    openExtensionPage,
    readBookmarkTree,
  }) => {
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.csv')

    await expect(page.getByText('Imported bookmarks')).toBeVisible()
    await expect(page.getByText('3 bookmarks')).toBeVisible()
    await expect(
      page.getByRole('radio', { name: /^Restore — merge/ }),
    ).toBeDisabled()
    await expect(
      page.getByRole('radio', { name: /^Restore — replace/ }),
    ).toBeDisabled()
    await expect(
      page.getByText(en.import_restoreUnavailable.message).first(),
    ).toBeVisible()

    await submitImport(page, 3)
    await expectSuccess(page)

    const [root] = await readBookmarkTree()
    const otherBookmarks = root?.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const docsFolder = importedFolder?.children?.find((n) => n.title === 'Docs')

    expect(docsFolder?.children?.map((n) => n.url)).toEqual([
      'https://csv-docs-a.example/page',
      'https://csv-docs-b.example/page',
    ])
  })

  test('success offers to import another file', async ({
    openExtensionPage,
  }) => {
    const page = await openImportPage(openExtensionPage)
    await chooseFile(page, 'bookmarks.csv')
    await submitImport(page, 3)
    await expectSuccess(page)
    await expect(
      page.getByRole('button', { name: en.import_openManager.message }),
    ).toBeVisible()

    await page.getByRole('button', { name: en.import_another.message }).click()

    await expect(page.getByText(en.dropFileHere.message)).toBeVisible()
  })

  test('an unsupported file shows an inline error and no import button', async ({
    openExtensionPage,
  }) => {
    const page = await openImportPage(openExtensionPage)
    await page.getByLabel(en.import_fileInputLabel.message).setInputFiles({
      name: 'notes.html',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not a bookmarks file'),
    })

    await expect(page.getByText(en.import_errorTitle.message)).toBeVisible()
    await expect(page.getByText(en.unsupportedFileFormat.message)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Import \d+/ })).toHaveCount(
      0,
    )
  })
})
