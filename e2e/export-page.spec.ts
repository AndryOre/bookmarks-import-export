import { readFile } from 'node:fs/promises'

import en from '../locales/en.json' with { type: 'json' }
import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

interface ExportedNode {
  title: string
  url?: string
  children?: ExportedNode[]
}

const seedTree: SeedBookmark[] = [
  {
    title: 'Work Folder',
    children: [
      { title: 'Work Doc', url: 'https://example.com/work-doc' },
      { title: 'Work Ticket', url: 'https://example.com/work-ticket' },
      {
        title: 'Archive Folder',
        children: [
          { title: 'Old Report', url: 'https://example.com/old-report' },
        ],
      },
    ],
  },
  {
    title: 'Personal Folder',
    children: [
      { title: 'Recipe Page', url: 'https://example.com/recipe-page' },
      { title: 'Photo Album', url: 'https://example.com/photo-album' },
    ],
  },
  { title: 'Standalone Link', url: 'https://example.com/standalone-link' },
]

const searchboxName = en.searchBookmarks.message

function leafTitles(nodes: ExportedNode[]): string[] {
  const titles: string[] = []
  for (const node of nodes) {
    if (node.url) titles.push(node.title)
    else titles.push(...leafTitles(node.children ?? []))
  }
  return titles.toSorted((a, b) => a.localeCompare(b))
}

test('exports a mixed selection as JSON and confirms with a toast', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')

  await expect(
    page.getByText(en.exportPage_nothingSelected.message),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Export 0 bookmarks' }),
  ).toBeDisabled()

  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  await page.getByRole('checkbox', { name: 'Standalone Link' }).check()
  await page.getByRole('checkbox', { name: 'Personal Folder' }).check()

  await expect(page.getByText('3 of 6 selected')).toBeVisible()

  await page.getByRole('button', { name: 'JSON', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export 3 bookmarks' }).click()
  const download = await downloadPromise

  const content = await readFile((await download.path()) as string, 'utf8')
  const [root] = JSON.parse(content) as ExportedNode[]
  expect(leafTitles(root?.children ?? [])).toEqual(
    ['Photo Album', 'Recipe Page', 'Standalone Link'].toSorted((a, b) =>
      a.localeCompare(b),
    ),
  )

  await expect(page.getByText('Exported 3 bookmarks')).toBeVisible()
  await expect(page.getByText(download.suggestedFilename())).toBeVisible()
})

test('exports a selection made from the search-filtered tree', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')

  await page.getByRole('searchbox', { name: searchboxName }).fill('Old Report')
  await page.getByRole('checkbox', { name: 'Old Report' }).check()
  await page.getByRole('button', { name: 'JSON', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export 1 bookmarks' }).click()
  const download = await downloadPromise

  const content = await readFile((await download.path()) as string, 'utf8')
  const [root] = JSON.parse(content) as ExportedNode[]
  expect(leafTitles(root?.children ?? [])).toEqual(['Old Report'])
})

test('pressing / focuses the search field and the term survives a reload', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')
  const search = page.getByRole('searchbox', { name: searchboxName })

  await expect(
    page.getByRole('checkbox', { name: 'Standalone Link' }),
  ).toBeVisible()
  await page.keyboard.press('/')
  await expect(search).toBeFocused()

  await search.fill('Recipe')
  await expect(page).toHaveURL(/#\/export\?q=Recipe$/)

  await page.reload()
  await expect(search).toHaveValue('Recipe')
  await expect(
    page.getByRole('checkbox', { name: 'Recipe Page' }),
  ).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: 'Standalone Link' }),
  ).toBeHidden()
})

test('shows an empty state for a search with no matches and clears it', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')

  await page.getByRole('searchbox', { name: searchboxName }).fill('zzzz')
  await expect(page.getByText('No bookmarks match "zzzz"')).toBeVisible()

  await page
    .getByRole('button', { name: en.exportPage_clearSearch.message })
    .click()
  await expect(
    page.getByRole('searchbox', { name: searchboxName }),
  ).toHaveValue('')
  await expect(
    page.getByRole('checkbox', { name: 'Standalone Link' }),
  ).toBeVisible()
})

test('the master checkbox selects everything, and collapse all hides nested rows', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')

  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  await expect(page.getByRole('checkbox', { name: 'Old Report' })).toBeVisible()

  await page
    .getByRole('checkbox', { name: en.exportPage_selectAllLabel.message })
    .check()
  await expect(page.getByText('6 of 6 selected')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Old Report' }).uncheck()
  await expect(page.getByText('5 of 6 selected')).toBeVisible()
  await expect(
    page.getByRole('checkbox', {
      name: en.exportPage_selectAllLabel.message,
    }),
  ).toHaveAttribute('aria-checked', 'mixed')

  await page
    .getByRole('button', { name: en.exportPage_collapseAll.message })
    .click()
  await expect(page.getByRole('checkbox', { name: 'Old Report' })).toBeHidden()
})
