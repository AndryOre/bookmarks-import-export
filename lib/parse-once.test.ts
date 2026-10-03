import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { detectFormat } from './detect-format'
import { summarizeImportDuplicates } from './import-duplicates'
import { getImportPreview } from './import-preview'
import { runImport } from './run-import'
import { resetFakeBookmarks } from './testing/fake-bookmarks'

vi.mock('./offscreen-download', () => ({
  downloadViaOffscreenDocument: vi.fn(async () => 1),
}))

function countParsesOf(spy: { mock: { calls: unknown[][] } }, text: string) {
  return spy.mock.calls.filter(([argument]) => argument === text).length
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parsing a picked JSON file', () => {
  it('parses a plain JSON export once across detect, preview, duplicates and import', async () => {
    const text = JSON.stringify([
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [{ title: 'Once A', url: 'https://once-a.example/' }],
      },
    ])
    const parse = vi.spyOn(JSON, 'parse')

    expect(detectFormat(text, 'application/json', 'a.json')).toBe('json')
    expect(
      getImportPreview(text, 'application/json', 'a.json').totalCount,
    ).toBe(1)
    await summarizeImportDuplicates(text, 'application/json', 'a.json')
    await runImport(text, 'application/json', 'restore-merge', 'a.json')

    expect(countParsesOf(parse, text)).toBe(1)
  })

  it('parses a Chrome Bookmarks file once across detect, preview and import', async () => {
    const text = JSON.stringify({
      roots: {
        bookmark_bar: {
          name: 'Bar',
          children: [{ name: 'Once C', url: 'https://once-c.example/' }],
        },
      },
    })
    const parse = vi.spyOn(JSON, 'parse')

    expect(detectFormat(text, 'application/json', 'Bookmarks')).toBe('chrome')
    expect(getImportPreview(text, 'application/json').totalCount).toBe(1)
    await summarizeImportDuplicates(text, 'application/json')
    await runImport(text, 'application/json', 'restore-merge')

    expect(countParsesOf(parse, text)).toBe(1)
  })
})
