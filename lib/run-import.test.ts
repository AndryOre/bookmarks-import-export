import { beforeEach, describe, expect, it } from 'vitest'

import { getImportPreview } from './import-preview'
import { runImport } from './run-import'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from './testing/fake-bookmarks'

const CSV_FIXTURE = 'title,url\nCSV A,https://csv.example/page\n'

const SINGLE_ROOT_JSON = JSON.stringify({
  id: '1',
  title: 'Bookmarks bar',
  dateAdded: 0,
  children: [
    { title: 'Root A', url: 'https://root-a.example/page', dateAdded: 0 },
    { title: 'Root B', url: 'https://root-b.example/page', dateAdded: 0 },
  ],
})

interface UrlNode {
  url?: string
  children?: UrlNode[]
}

function collectUrls(nodes: UrlNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.url ? [node.url] : []),
    ...collectUrls(node.children ?? []),
  ])
}

beforeEach(() => {
  resetFakeBookmarks()
})

describe('runImport', () => {
  it('rejects content whose format cannot be detected', async () => {
    await expect(
      runImport('not a bookmarks file', 'text/plain', 'folder'),
    ).rejects.toThrow()
  })

  it('rejects JSON that does not parse', async () => {
    await expect(
      runImport('{not json', 'application/json', 'folder'),
    ).rejects.toThrow()
  })

  it('imports a JSON file whose root is a single object, matching its preview', async () => {
    const preview = getImportPreview(SINGLE_ROOT_JSON, 'application/json')
    expect(preview.totalCount).toBe(2)

    await runImport(SINGLE_ROOT_JSON, 'application/json', 'restore-merge')

    expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
      'https://root-a.example/page',
      'https://root-b.example/page',
    ])
  })

  it('imports CSV content into a folder regardless of mode', async () => {
    await runImport(CSV_FIXTURE, 'text/csv', 'restore-replace')

    expect(collectUrls(getFakeBookmarksRoot().children ?? [])).toEqual([
      'https://csv.example/page',
    ])
  })
})
