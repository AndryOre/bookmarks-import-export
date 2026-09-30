import type { Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from './fixtures'

const FIXTURES_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

async function openAdvancedImport(
  openExtensionPage: (pageName: string) => Promise<Page>,
): Promise<Page> {
  return openExtensionPage('advanced-import.html')
}

async function uploadFixture(page: Page, fileName: string): Promise<void> {
  await page
    .locator('#file-drop-zone-input')
    .setInputFiles(path.join(FIXTURES_DIRECTORY, fileName))
}

async function selectImportMode(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: label }).click()
}

async function runImport(
  page: Page,
  { confirmReplace = false }: { confirmReplace?: boolean } = {},
): Promise<void> {
  await page.getByRole('button', { name: 'Import', exact: true }).click()

  if (confirmReplace) {
    await page.getByRole('button', { name: 'Yes, replace' }).click()
  }

  await expect(page.getByText('Bookmarks imported successfully!')).toBeVisible()
}

test.describe('HTML import', () => {
  test('preview shows correct counts and location data', async ({
    openExtensionPage,
  }) => {
    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.html')

    await expect(page.getByText('Bookmarks bar')).toBeVisible()
    await expect(page.getByText('2 bookmarks')).toBeVisible()
    await expect(page.getByText('Other bookmarks')).toBeVisible()
    await expect(page.getByText('1 bookmarks')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Restore — merge' }),
    ).toBeEnabled()
  })

  test('folder mode creates an "Imported bookmarks" folder, leaving existing bookmarks untouched', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      {
        title: 'Existing other bookmark',
        url: 'https://existing-other.example/page',
      },
    ])

    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.html')
    await selectImportMode(page, 'Create folder')
    await runImport(page)

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
      importedFolder?.children?.some(
        (n) => n.url === 'https://html-other-a.example/page',
      ),
    ).toBe(true)

    expect(
      otherBookmarks?.children?.some(
        (n) => n.url === 'https://existing-other.example/page',
      ),
    ).toBe(true)
  })

  test('restore-merge writes into the existing roots alongside what is already there', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      {
        title: 'Existing other bookmark',
        url: 'https://existing-other.example/page',
      },
    ])

    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.html')
    await selectImportMode(page, 'Restore — merge')
    await runImport(page)

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

  test('restore-replace clears the existing roots before restoring', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      {
        title: 'Existing other bookmark',
        url: 'https://existing-other.example/page',
      },
    ])

    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.html')
    await selectImportMode(page, 'Restore — replace')
    await runImport(page, { confirmReplace: true })

    const [root] = await readBookmarkTree()
    const bookmarksBar = root?.children?.find((n) => n.id === '1')
    const otherBookmarks = root?.children?.find((n) => n.id === '2')

    expect(bookmarksBar?.children?.map((n) => n.url)).toEqual([
      'https://html-bar-a.example/page',
      'https://html-bar-b.example/page',
    ])
    expect(otherBookmarks?.children?.map((n) => n.url)).toEqual([
      'https://html-other-a.example/page',
    ])
    expect(
      otherBookmarks?.children?.some(
        (n) => n.url === 'https://existing-other.example/page',
      ),
    ).toBe(false)
  })
})

test.describe('JSON import', () => {
  test('preview shows correct counts and location data', async ({
    openExtensionPage,
  }) => {
    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.json')

    await expect(page.getByText('Bookmarks bar')).toBeVisible()
    await expect(page.getByText('1 bookmarks')).toBeVisible()
    await expect(page.getByText('Other bookmarks')).toBeVisible()
    await expect(page.getByText('2 bookmarks')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Restore — replace' }),
    ).toBeEnabled()
  })

  test('folder mode creates an "Imported bookmarks" folder, leaving existing bookmarks untouched', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      {
        title: 'Existing other bookmark',
        url: 'https://existing-other.example/page',
      },
    ])

    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.json')
    await selectImportMode(page, 'Create folder')
    await runImport(page)

    const [root] = await readBookmarkTree()
    const otherBookmarks = root?.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const importedBar = importedFolder?.children?.find(
      (n) => n.title === 'Bookmarks bar',
    )

    expect(importedBar?.children?.map((n) => n.url)).toEqual([
      'https://json-bar-a.example/page',
    ])
    expect(importedFolder?.children?.map((n) => n.url)).toEqual(
      expect.arrayContaining([
        'https://json-other-a.example/page',
        'https://json-other-b.example/page',
      ]),
    )
    expect(
      otherBookmarks?.children?.some(
        (n) => n.url === 'https://existing-other.example/page',
      ),
    ).toBe(true)
  })

  test('restore-merge writes into the existing roots alongside what is already there', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      {
        title: 'Existing other bookmark',
        url: 'https://existing-other.example/page',
      },
    ])

    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.json')
    await selectImportMode(page, 'Restore — merge')
    await runImport(page)

    const [root] = await readBookmarkTree()
    const bookmarksBar = root?.children?.find((n) => n.id === '1')
    const otherBookmarks = root?.children?.find((n) => n.id === '2')

    expect(
      bookmarksBar?.children?.some(
        (n) => n.url === 'https://json-bar-a.example/page',
      ),
    ).toBe(true)
    expect(otherBookmarks?.children?.map((n) => n.url)).toEqual(
      expect.arrayContaining([
        'https://existing-other.example/page',
        'https://json-other-a.example/page',
        'https://json-other-b.example/page',
      ]),
    )
  })

  test('restore-replace clears the existing roots before restoring', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks([
      {
        title: 'Existing other bookmark',
        url: 'https://existing-other.example/page',
      },
    ])

    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.json')
    await selectImportMode(page, 'Restore — replace')
    await runImport(page, { confirmReplace: true })

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
    expect(
      otherBookmarks?.children?.some(
        (n) => n.url === 'https://existing-other.example/page',
      ),
    ).toBe(false)
  })
})

test.describe('CSV import', () => {
  test('preview shows the total count and no location data', async ({
    openExtensionPage,
  }) => {
    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.csv')

    await expect(
      page.getByText('Imported bookmarks', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('3 bookmarks')).toBeVisible()
    await expect(
      page.getByText('Restore modes are not available for CSV files'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Restore — merge' }),
    ).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Restore — replace' }),
    ).toBeDisabled()
  })

  test('folder mode creates the nested folder structure from the folder column', async ({
    openExtensionPage,
    readBookmarkTree,
  }) => {
    const page = await openAdvancedImport(openExtensionPage)
    await uploadFixture(page, 'bookmarks.csv')
    await runImport(page)

    const [root] = await readBookmarkTree()
    const otherBookmarks = root?.children?.find((n) => n.id === '2')
    const importedFolder = otherBookmarks?.children?.find(
      (n) => n.title === 'Imported bookmarks',
    )
    const docsFolder = importedFolder?.children?.find((n) => n.title === 'Docs')

    expect(
      importedFolder?.children?.some(
        (n) => n.url === 'https://csv-root-a.example/page',
      ),
    ).toBe(true)
    expect(docsFolder?.children?.map((n) => n.url)).toEqual([
      'https://csv-docs-a.example/page',
      'https://csv-docs-b.example/page',
    ])
  })
})
