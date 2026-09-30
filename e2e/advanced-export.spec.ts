/// <reference types="chrome" />
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { expect, test } from './fixtures'
import type { SeedBookmark } from './fixtures'

/**
 * The shape `exportToJSON` produces for a bookmark or folder node, trimmed
 * to what these tests assert on (title, url, and nested children).
 */
interface ExportedNode {
  title: string
  url?: string
  children?: ExportedNode[]
}

/**
 * A nested bookmarks tree mixing individual bookmarks and folders (one of
 * which itself has a nested subfolder), seeded fresh by both tests below.
 */
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

/**
 * Finds the title of the browser-default bucket folder ("Bookmarks bar",
 * "Other bookmarks", etc.) that `seedTree` landed under — `seedBookmarks`
 * creates nodes with no explicit `parentId`, so Chrome places them under
 * whichever bucket is its own default. Reading it back rather than
 * hardcoding a title keeps the test independent of Chrome's exact locale
 * string for that folder.
 * @param readBookmarkTree The `e2e/fixtures.ts` fixture that reads the live bookmark tree.
 * @returns The title of the bucket folder containing the seeded tree.
 */
async function findSeededRootFolderTitle(
  readBookmarkTree: () => Promise<chrome.bookmarks.BookmarkTreeNode[]>,
): Promise<string> {
  const [root] = await readBookmarkTree()
  const bucket = root?.children?.find((folder) =>
    folder.children?.some((child) => child.title === 'Work Folder'),
  )
  if (!bucket) throw new Error('Seeded root folder not found in bookmark tree')
  return bucket.title
}

/**
 * Expands the folder row for `title`, so its children render into the tree
 * view. Folders start collapsed (`autoExpandFoldersStore`'s fallback is
 * `false`), so every folder along the path to a bookmark this suite
 * selects needs an explicit expand.
 *
 * The row's accessible name isn't just `title` — it also picks up its
 * nested checkbox's own `aria-label` (also `title`), so this matches by
 * substring rather than `exact: true`.
 * @param page The Advanced Export page.
 * @param title The folder row's title to expand.
 */
async function expandFolder(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: title }).click()
}

/**
 * Switches the export format selector to JSON and clicks the export
 * button, then reads the downloaded file back off disk and returns its
 * root node's children — the JSON exporter wraps the selection in a
 * single `id="0"` root (see `lib/exporters/export-json.ts`).
 * @param page The Advanced Export page.
 * @returns The exported root node's children.
 */
async function exportSelectionAsJson(page: Page): Promise<ExportedNode[]> {
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'JSON', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export format' }).click()
  const download = await downloadPromise

  const filePath = await download.path()
  const content = await readFile(filePath as string, 'utf8')
  const [root] = JSON.parse(content) as ExportedNode[]
  return root?.children ?? []
}

/**
 * Flattens an exported tree down to the titles of its leaf (bookmark)
 * nodes, ignoring folder titles — these tests only assert on which
 * bookmarks made it into the export, not the containing folder structure.
 * @param nodes The exported nodes to flatten.
 * @returns The leaf bookmark titles, sorted for order-independent comparison.
 */
function leafTitles(nodes: ExportedNode[]): string[] {
  const titles: string[] = []
  for (const node of nodes) {
    if (node.url) titles.push(node.title)
    else titles.push(...leafTitles(node.children ?? []))
  }
  return titles.toSorted((a, b) => a.localeCompare(b))
}

test('exports exactly a mixed selection of bookmarks and whole folders', async ({
  seedBookmarks,
  openExtensionPage,
  readBookmarkTree,
}) => {
  await seedBookmarks(seedTree)
  const rootFolderTitle = await findSeededRootFolderTitle(readBookmarkTree)
  const page = await openExtensionPage('advanced-export.html')

  await expandFolder(page, rootFolderTitle)
  await expandFolder(page, 'Personal Folder')

  await page.getByRole('checkbox', { name: 'Standalone Link' }).check()
  await page.getByRole('checkbox', { name: 'Personal Folder' }).check()

  const exported = await exportSelectionAsJson(page)

  expect(
    exported.map((node) => node.title).toSorted((a, b) => a.localeCompare(b)),
  ).not.toContain('Work Folder')
  expect(leafTitles(exported)).toEqual(
    ['Photo Album', 'Recipe Page', 'Standalone Link'].toSorted((a, b) =>
      a.localeCompare(b),
    ),
  )
})

test('exports exactly a selection made from the search-filtered tree', async ({
  seedBookmarks,
  openExtensionPage,
}) => {
  await seedBookmarks(seedTree)
  const page = await openExtensionPage('advanced-export.html')

  await page
    .getByRole('searchbox', { name: 'Search bookmarks' })
    .fill('Old Report')

  await page.getByRole('checkbox', { name: 'Old Report' }).check()

  const exported = await exportSelectionAsJson(page)

  expect(leafTitles(exported)).toEqual(['Old Report'])
})
