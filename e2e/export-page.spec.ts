import type { Page } from '@playwright/test'
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

async function selectRow(page: Page, name: string) {
  const row = page.getByRole('treeitem', { name, exact: true })
  await row.focus()
  await page.keyboard.press('Space')
}

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
  await selectRow(page, 'Standalone Link')
  await selectRow(page, 'Personal Folder')

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

const structuralFormats = [
  {
    format: 'Markdown',
    extension: '.md',
    shapes: [
      '- Personal Folder',
      '- [Recipe Page](https://example.com/recipe-page)',
    ],
  },
  {
    format: 'OPML',
    extension: '.opml',
    shapes: ['<opml version="2.0">', '<outline type="link" text="Recipe Page"'],
  },
  {
    format: 'XBEL',
    extension: '.xbel',
    shapes: [
      '<xbel version="1.0">',
      '<bookmark href="https://example.com/recipe-page"',
    ],
  },
] as const

for (const { format, extension, shapes } of structuralFormats) {
  test(`exports a selected folder as ${format} with the right file name and content shape`, async ({
    seedBookmarks,
    openExtensionPage,
  }) => {
    await seedBookmarks(seedTree)
    const page = await openExtensionPage('app.html#/export')

    await page
      .getByRole('button', { name: en.exportPage_expandAll.message })
      .click()
    await selectRow(page, 'Personal Folder')
    await page.getByRole('button', { name: format, exact: true }).click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export 2 bookmarks' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename().endsWith(extension)).toBe(true)
    const content = await readFile((await download.path()) as string, 'utf8')
    for (const shape of shapes) expect(content).toContain(shape)
    expect(content).not.toContain('Work Doc')
  })
}

test('exports an icon-less bookmark as HTML without an ICON attribute', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')

  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  await selectRow(page, 'Standalone Link')
  await page.getByRole('button', { name: 'HTML', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export 1 bookmark' }).click()
  const download = await downloadPromise

  const content = await readFile((await download.path()) as string, 'utf8')
  expect(content).toContain('https://example.com/standalone-link')
  expect(content).not.toContain('ICON=')
})

test('exports a selection made from the search-filtered tree', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('app.html#/export')

  await page.getByRole('searchbox', { name: searchboxName }).fill('Old Report')
  await selectRow(page, 'Old Report')
  await page.getByRole('button', { name: 'JSON', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export 1 bookmark' }).click()
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

  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  await expect(
    page.getByRole('treeitem', { name: 'Standalone Link' }),
  ).toBeVisible()
  await page.keyboard.press('/')
  await expect(search).toBeFocused()

  await search.fill('Recipe')
  await expect(page).toHaveURL(/#\/export\?q=Recipe$/)

  await page.reload()
  await expect(search).toHaveValue('Recipe')
  await expect(
    page.getByRole('treeitem', { name: 'Recipe Page' }),
  ).toBeVisible()
  await expect(
    page.getByRole('treeitem', { name: 'Standalone Link' }),
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
  await page
    .getByRole('button', { name: en.exportPage_expandAll.message })
    .click()
  await expect(
    page.getByRole('treeitem', { name: 'Standalone Link' }),
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
  await expect(page.getByRole('treeitem', { name: 'Old Report' })).toBeVisible()

  await page
    .getByRole('checkbox', { name: en.exportPage_selectAllLabel.message })
    .click()
  await expect(page.getByText('6 of 6 selected')).toBeVisible()

  await selectRow(page, 'Old Report')
  await expect(page.getByText('5 of 6 selected')).toBeVisible()
  await expect(
    page.getByRole('checkbox', {
      name: en.exportPage_selectAllLabel.message,
    }),
  ).toHaveAttribute('aria-checked', 'mixed')

  await page
    .getByRole('button', { name: en.exportPage_collapseAll.message })
    .click()
  await expect(page.getByRole('treeitem', { name: 'Old Report' })).toBeHidden()
})
