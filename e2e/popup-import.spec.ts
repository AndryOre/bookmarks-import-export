import type { Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from './fixtures'

const FIXTURES_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
)

async function openImportTab(
  openExtensionPage: (pageName: string) => Promise<Page>,
): Promise<Page> {
  const popup = await openExtensionPage('popup.html')
  await popup.getByRole('tab', { name: 'Import' }).click()
  return popup
}

async function uploadFixture(page: Page, fileName: string): Promise<void> {
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(FIXTURES_DIRECTORY, fileName))
}

async function selectDefaultMode(page: Page, label: string): Promise<void> {
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: label }).click()
}

async function clickImport(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
}

test('quick import merges into the real bookmarks bar with the default mode (fixes #24)', async ({
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

  const popup = await openImportTab(openExtensionPage)

  await uploadFixture(popup, 'bookmarks.html')
  await clickImport(popup)

  await expect(
    popup.getByText('Bookmarks imported successfully!'),
  ).toBeVisible()

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

test('restore-replace requires confirmation, and canceling imports nothing', async ({
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

  const popup = await openImportTab(openExtensionPage)
  await selectDefaultMode(popup, 'Restore — replace')
  await expect(
    popup.getByText(
      'This will permanently delete all current bookmarks in your Bookmarks Bar and Other Bookmarks',
    ),
  ).toBeVisible()

  await uploadFixture(popup, 'bookmarks.html')
  await clickImport(popup)

  await expect(popup.getByText('Replace existing bookmarks?')).toBeVisible()
  await popup.getByRole('button', { name: 'Cancel' }).click()

  await expect(popup.getByText('Replace existing bookmarks?')).not.toBeVisible()
  await expect(
    popup.getByText('Bookmarks imported successfully!'),
  ).not.toBeVisible()

  const [root] = await readBookmarkTree()
  const otherBookmarks = root?.children?.find((n) => n.id === '2')

  expect(otherBookmarks?.children?.map((n) => n.url)).toEqual([
    'https://existing-other.example/page',
  ])
})

test('confirming restore-replace clears the existing roots before restoring', async ({
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

  const popup = await openImportTab(openExtensionPage)
  await selectDefaultMode(popup, 'Restore — replace')

  await uploadFixture(popup, 'bookmarks.html')
  await clickImport(popup)

  await popup.getByRole('button', { name: 'Yes, replace' }).click()

  await expect(
    popup.getByText('Bookmarks imported successfully!'),
  ).toBeVisible()

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

test('a CSV file imports into "Imported bookmarks" even when the stored default is a restore mode', async ({
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

  const popup = await openImportTab(openExtensionPage)
  await selectDefaultMode(popup, 'Restore — replace')

  await uploadFixture(popup, 'bookmarks.csv')
  await clickImport(popup)

  await expect(
    popup.getByText('Bookmarks imported successfully!'),
  ).toBeVisible()

  const [root] = await readBookmarkTree()
  const otherBookmarks = root?.children?.find((n) => n.id === '2')
  const importedFolder = otherBookmarks?.children?.find(
    (n) => n.title === 'Imported bookmarks',
  )

  expect(importedFolder).toBeTruthy()
  expect(
    importedFolder?.children?.some(
      (n) => n.url === 'https://csv-root-a.example/page',
    ),
  ).toBe(true)
  expect(
    otherBookmarks?.children?.some(
      (n) => n.url === 'https://existing-other.example/page',
    ),
  ).toBe(true)
})
