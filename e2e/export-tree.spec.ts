import type { Page } from '@playwright/test'

import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

const seedTree: SeedBookmark[] = [
  {
    title: 'Work Folder',
    children: [
      { title: 'Work Doc', url: 'https://example.com/work-doc' },
      { title: 'Work Ticket', url: 'https://example.com/work-ticket' },
    ],
  },
  {
    title: 'Personal Folder',
    children: [{ title: 'Recipe Page', url: 'https://example.com/recipe' }],
  },
  { title: 'Standalone Link', url: 'https://example.com/standalone-link' },
]

function treeOf(page: Page) {
  return page.getByRole('tree', { name: en.exportPage_treeLabel.message })
}

function rowOf(page: Page, name: string) {
  return treeOf(page).getByRole('treeitem', { name, exact: true })
}

async function openCollapsedTree(page: Page) {
  await expect(treeOf(page)).toBeVisible()
  await page
    .getByRole('button', { name: en.exportPage_collapseAll.message })
    .click()
  await expect(treeOf(page)).toBeVisible()
}

test('exposes the WAI-ARIA tree roles and attributes', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()

  const tree = treeOf(page)
  await expect(tree).toHaveAttribute('aria-multiselectable', 'true')

  const work = rowOf(page, 'Work Folder')
  await expect(work).toHaveAttribute('aria-level', '2')
  await expect(work).toHaveAttribute('aria-setsize', '3')
  await expect(work).toHaveAttribute('aria-posinset', '1')
  await expect(work).toHaveAttribute('aria-expanded', 'true')
  await expect(work).toHaveAttribute('aria-checked', 'false')

  const link = rowOf(page, 'Standalone Link')
  await expect(link).toHaveAttribute('aria-level', '2')
  await expect(link).toHaveAttribute('aria-posinset', '3')
  await expect(link).not.toHaveAttribute('aria-expanded')

  await expect(tree.getByRole('checkbox')).toHaveCount(0)
  await expect(tree.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1)
})

test('the tree is a single tab stop and focus is visibly ringed', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await openCollapsedTree(page)
  const tree = treeOf(page)

  await page.getByRole('searchbox').focus()
  for (let step = 0; step < 15; step += 1) {
    if ((await tree.locator(':focus').count()) > 0) break
    await page.keyboard.press('Tab')
  }
  const focusedRow = tree.getByRole('treeitem').first()
  await expect(focusedRow).toBeFocused()

  await page.keyboard.press('ArrowDown')
  const secondRow = tree.getByRole('treeitem').nth(1)
  await expect(secondRow).toBeFocused()
  await expect(secondRow).not.toHaveCSS('box-shadow', 'none')

  await page.keyboard.press('Tab')
  await expect(tree.locator(':focus')).toHaveCount(0)

  await page.keyboard.press('Shift+Tab')
  await expect(secondRow).toBeFocused()
})

test('arrow keys, Home and End navigate; Right and Left expand, enter and collapse', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await openCollapsedTree(page)
  const tree = treeOf(page)
  const rows = tree.getByRole('treeitem')

  await rows.first().focus()
  await page.keyboard.press('End')
  const otherRoot = rows.nth(1)
  await expect(otherRoot).toBeFocused()
  await page.keyboard.press('Home')
  await expect(rows.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(otherRoot).toBeFocused()

  await expect(otherRoot).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('ArrowRight')
  await expect(otherRoot).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('ArrowRight')
  const work = rowOf(page, 'Work Folder')
  await expect(work).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await expect(work).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(rowOf(page, 'Work Doc')).toBeFocused()

  await page.keyboard.press('ArrowLeft')
  await expect(work).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(work).toHaveAttribute('aria-expanded', 'false')
  await expect(rowOf(page, 'Work Doc')).toBeHidden()

  await page.keyboard.press('Enter')
  await expect(work).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Enter')
  await expect(work).toHaveAttribute('aria-expanded', 'false')
})

test('Space toggles selection, including a folder and its mixed state', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()

  const work = rowOf(page, 'Work Folder')
  const workDocument = rowOf(page, 'Work Doc')

  await work.focus()
  await page.keyboard.press('Space')
  await expect(work).toHaveAttribute('aria-checked', 'true')
  await expect(workDocument).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('2 of 4 selected')).toBeVisible()

  await workDocument.focus()
  await page.keyboard.press('Space')
  await expect(workDocument).toHaveAttribute('aria-checked', 'false')
  await expect(work).toHaveAttribute('aria-checked', 'mixed')

  await work.focus()
  await page.keyboard.press('Space')
  await expect(work).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Space')
  await expect(work).toHaveAttribute('aria-checked', 'false')
  await expect(
    page.getByText(en.exportPage_nothingSelected.message),
  ).toBeVisible()
})

test('shows an empty state with a link to Import when there are no bookmarks', async ({
  serviceWorker,
  openExtensionPage,
}) => {
  await serviceWorker.evaluate(async () => {
    const [root] = await chrome.bookmarks.getTree()
    const folders = root?.children ?? []
    for (const folder of folders) {
      const children = folder.children ?? []
      for (const child of children) {
        await chrome.bookmarks.removeTree(child.id)
      }
    }
  })
  const page = await openExtensionPage('app.html#/export')

  await expect(page.getByText(en.exportPage_emptyTitle.message)).toBeVisible()
  await page
    .getByRole('link', { name: en.exportPage_goToImport.message })
    .click()
  await expect(page).toHaveURL(/#\/import/)
})

test('shows an error state when loading fails and Try again reloads', async ({
  seedBookmarks,
  serviceWorker,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await expect(treeOf(page)).toBeVisible()

  await page.evaluate(() => {
    const bookmarks = (
      globalThis as unknown as {
        chrome: { bookmarks: { getTree: () => Promise<unknown> } }
      }
    ).chrome.bookmarks
    const original = bookmarks.getTree
    bookmarks.getTree = () => Promise.reject(new Error('getTree failed'))
    Object.assign(globalThis, {
      restoreGetTree: () => {
        bookmarks.getTree = original
      },
    })
  })
  await serviceWorker.evaluate(() =>
    chrome.bookmarks.create({
      title: 'Trigger Reload',
      url: 'https://example.com/trigger',
    }),
  )

  await expect(page.getByText(en.exportPage_errorTitle.message)).toBeVisible()

  await page.evaluate(() =>
    (globalThis as unknown as { restoreGetTree: () => void }).restoreGetTree(),
  )
  await page
    .getByRole('button', { name: en.exportPage_tryAgain.message })
    .click()
  await expect(treeOf(page)).toBeVisible()
  await expect(page.getByText(en.exportPage_errorTitle.message)).toBeHidden()
})

test('adding and removing a bookmark updates the tree without a reload', async ({
  seedBookmarks,
  serviceWorker,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  await expect(rowOf(page, 'Standalone Link')).toBeVisible()

  const createdId = await serviceWorker.evaluate(async () => {
    const created = await chrome.bookmarks.create({
      title: 'Fresh Link',
      url: 'https://example.com/fresh',
    })
    return created.id
  })
  await expect(rowOf(page, 'Fresh Link')).toBeVisible()
  await expect(rowOf(page, 'Standalone Link')).toBeVisible()

  await serviceWorker.evaluate(
    (id: string) => chrome.bookmarks.remove(id),
    createdId,
  )
  await expect(rowOf(page, 'Fresh Link')).toBeHidden()
})

test('virtualizes a 5,000-bookmark library and keyboard navigation reaches unrendered rows', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  test.setTimeout(180_000)
  const folderCount = 10
  const bookmarksPerFolder = 500
  await seedBookmarks(
    Array.from({ length: folderCount }, (_, folderIndex) => ({
      title: `Bulk Folder ${folderIndex + 1}`,
      children: Array.from({ length: bookmarksPerFolder }, (_, index) => ({
        title: `Bulk ${folderIndex + 1}-${index + 1}`,
        url: `https://example.com/bulk/${folderIndex + 1}/${index + 1}`,
      })),
    })),
  )
  const page = await openExtensionPage('app.html#/export')
  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  const tree = treeOf(page)
  const rows = tree.getByRole('treeitem')
  await expect(tree).toBeVisible()
  await expect(rows.first()).toBeVisible()

  const renderedCount = await rows.count()
  expect(renderedCount).toBeGreaterThan(0)
  expect(renderedCount).toBeLessThan(120)

  await rows.first().focus()
  await page.keyboard.press('End')
  const lastRow = rowOf(page, `Bulk ${folderCount}-${bookmarksPerFolder}`)
  await expect(lastRow).toBeFocused()
  await expect(lastRow).toHaveAttribute(
    'aria-posinset',
    String(bookmarksPerFolder),
  )
  await expect(lastRow).not.toHaveCSS('box-shadow', 'none')
  expect(await rows.count()).toBeLessThan(120)

  await page.keyboard.press('Home')
  await expect(rows.first()).toBeFocused()
  await expect(rows.first()).toHaveAttribute('aria-posinset', '1')
  await expect(lastRow).toBeHidden()
})

test('searching a folder name shows all its children and ticking selects them', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  await page.getByRole('searchbox').fill('Work Folder')

  await expect(rowOf(page, 'Work Doc')).toBeVisible()
  await expect(rowOf(page, 'Work Ticket')).toBeVisible()

  await rowOf(page, 'Work Folder').focus()
  await page.keyboard.press('Space')
  await expect(rowOf(page, 'Work Doc')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('2 of 4 selected')).toBeVisible()
})
