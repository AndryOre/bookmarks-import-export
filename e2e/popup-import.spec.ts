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

/**
 * The visible "Import" button only opens the native file picker
 * (`fileInputReference.current?.click()`); there is no separate submit
 * step. Picking a file — which `uploadFixture` does directly via
 * `setInputFiles`, bypassing the picker — fires the hidden input's
 * `onChange` and runs the whole import (or opens the replace-confirm
 * dialog) immediately. Quick import's success/error UX is the browser's
 * native `alert()` (by design — see AO-889), not DOM text, so Playwright
 * only observes it as a `dialog` event. Registers the listener before
 * triggering `action` so it can't miss a dialog that fires immediately,
 * and asserts the expected message.
 *
 * Chrome closes an extension popup as soon as it calls a native dialog
 * (alert/confirm/prompt) — popups don't support them. Calling
 * `dialog.accept()` in that case doesn't reject quickly either: it hangs
 * for this action's full timeout before failing with "Target page ... has
 * been closed", which is long enough to blow the test's own timeout. Fire
 * it without awaiting instead — there's nothing left to unblock once the
 * popup that owned the dialog is already gone, and the message was already
 * read off the `dialog` event before this call. Bookmark-state assertions
 * after this helper read through a separate fixture, not the (possibly
 * now-closed) popup page.
 * @param page The popup page the `dialog` event is expected on.
 * @param action Triggers the import; the dialog listener is registered
 *   before this runs.
 */
async function expectSuccessAlert(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  const dialogPromise = page.waitForEvent('dialog')
  await action()
  const dialog = await dialogPromise
  expect(dialog.message()).toBe('Bookmarks imported successfully!')
  void dialog.accept().catch(() => {})
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

  await expectSuccessAlert(popup, () => uploadFixture(popup, 'bookmarks.html'))

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

  await expect(popup.getByText('Replace existing bookmarks?')).toBeVisible()
  await popup.getByRole('button', { name: 'Cancel' }).click()

  await expect(popup.getByText('Replace existing bookmarks?')).not.toBeVisible()

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

  await expectSuccessAlert(popup, () =>
    popup.getByRole('button', { name: 'Yes, replace' }).click(),
  )

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

  await expectSuccessAlert(popup, () => uploadFixture(popup, 'bookmarks.csv'))

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
