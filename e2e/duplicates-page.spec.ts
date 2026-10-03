import type { Page } from '@playwright/test'

import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

const SEED_TREE: SeedBookmark[] = [
  {
    title: 'Reading',
    children: [
      { title: 'First copy', url: 'https://example.com/page' },
      { title: 'Solo', url: 'https://example.org/solo' },
      { title: 'Second copy', url: 'https://www.example.com/page/' },
    ],
  },
  { title: 'Third copy', url: 'https://example.com/page#top' },
  { title: 'Empty folder', children: [] },
]

function collectTitles(nodes: chrome.bookmarks.BookmarkTreeNode[]): string[] {
  return nodes.flatMap((node) => [
    node.title,
    ...collectTitles(node.children ?? []),
  ])
}

async function openDuplicatesPage(
  openExtensionPage: (pageName: string) => Promise<Page>,
): Promise<Page> {
  return openExtensionPage('app.html#/duplicates')
}

test.describe('Duplicates page', () => {
  test('lists groups with the oldest copy kept by default', async ({
    openExtensionPage,
    seedBookmarks,
  }) => {
    await seedBookmarks(SEED_TREE)
    const page = await openDuplicatesPage(openExtensionPage)

    await expect(page.getByText('Groups: 1 · Extra copies: 2')).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: en.duplicates_deleteButton.n.replace('$1', '2'),
      }),
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'First copy' })).toBeChecked()
    await expect(
      page.getByRole('radio', { name: 'Second copy' }),
    ).not.toBeChecked()
  })

  test('deleting removes exactly the copies not kept and keeps folders', async ({
    openExtensionPage,
    seedBookmarks,
    readBookmarkTree,
  }) => {
    await seedBookmarks(SEED_TREE)
    const page = await openDuplicatesPage(openExtensionPage)

    await page.getByRole('radio', { name: 'Third copy' }).click()
    await expect(page.getByText('Groups: 1 · Extra copies: 2')).toBeVisible()

    await page.getByRole('button', { name: 'Delete 2 extra copies' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('Delete 2 extra copies?')
    await dialog.getByRole('button', { name: 'Delete 2 extra copies' }).click()

    await expect(page.getByText('Deleted 2 extra copies')).toBeVisible()
    await expect(page.getByText(en.duplicates_emptyTitle.message)).toBeVisible()

    const titles = collectTitles(await readBookmarkTree())
    expect(titles).toContain('Third copy')
    expect(titles).not.toContain('First copy')
    expect(titles).not.toContain('Second copy')
    expect(titles).toContain('Solo')
    expect(titles).toContain('Reading')
    expect(titles).toContain('Empty folder')
  })

  test('shows the empty state when nothing is duplicated', async ({
    openExtensionPage,
  }) => {
    const page = await openDuplicatesPage(openExtensionPage)

    await expect(page.getByText(en.duplicates_emptyTitle.message)).toBeVisible()
    await expect(
      page.getByRole('button', { name: en.duplicates_scanAgain.message }),
    ).toBeVisible()
  })

  test('is reachable from the sidebar below Import', async ({
    openExtensionPage,
  }) => {
    const page = await openExtensionPage('app.html#/import')
    const nav = page.getByRole('navigation', {
      name: en.shell_navLabel.message,
    })

    await nav
      .getByRole('link', { name: en.shell_navDuplicates.message })
      .click()

    await expect(page).toHaveURL(/#\/duplicates$/)
  })
})
