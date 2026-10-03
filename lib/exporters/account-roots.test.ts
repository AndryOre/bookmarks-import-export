import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { resetFakeBookmarks } from '@/lib/testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

import { exportToCSV } from './export-csv'
import { exportToHTML } from './export-html'
import { exportToJSON } from './export-json'
import { exportToMarkdown } from './export-markdown'

const flags = {
  includeIconData: false,
  includeDateAdded: false,
  includeDateLastUsed: false,
  includeDateGroupModified: false,
  hideOtherBookmarks: false,
  hideParentFolder: false,
}

function seedAccountRoots(): void {
  const root: ExtendedBookmarkTreeNode = {
    id: '0',
    title: '',
    syncing: false,
    children: [
      {
        id: 'acct-bar',
        parentId: '0',
        title: 'Account bar',
        folderType: 'bookmarks-bar',
        syncing: false,
        children: [
          {
            id: '10',
            parentId: 'acct-bar',
            title: 'Sub',
            syncing: false,
            children: [
              {
                id: '11',
                parentId: '10',
                title: 'In sub',
                url: 'https://sub.example/',
                syncing: false,
              },
            ],
          },
        ],
      },
      {
        id: 'acct-other',
        parentId: '0',
        title: 'Account other',
        folderType: 'other',
        syncing: false,
        children: [
          {
            id: '20',
            parentId: 'acct-other',
            title: 'Loose',
            url: 'https://loose.example/',
            syncing: false,
          },
        ],
      },
    ],
  }
  fakeBrowser.bookmarks.getTree = async () => [structuredClone(root)]
}

beforeEach(() => {
  resetFakeBookmarks()
  seedAccountRoots()
})

describe('exporters with folderType roots and non-standard ids', () => {
  it('HTML marks the account bar and hides the account Other folder', async () => {
    const html = await exportToHTML({
      selectedBookmarks: null,
      ...flags,
      hideOtherBookmarks: true,
      hideParentFolder: true,
    })

    expect(html).toContain(
      '<H3 PERSONAL_TOOLBAR_FOLDER="true">Account bar</H3>',
    )
    expect(html).not.toContain('Account other')
    expect(html).not.toContain('>Sub<')
    expect(html).toContain('https://loose.example/')
  })

  it('JSON keeps account roots and flattens under them', async () => {
    const text = JSON.stringify(
      await exportToJSON({
        selectedBookmarks: null,
        ...flags,
        hideOtherBookmarks: true,
        hideParentFolder: true,
      }),
    )

    expect(text).toContain('Account bar')
    expect(text).not.toContain('Account other')
    expect(text).not.toContain('"Sub"')
  })

  it('Markdown honors hide flags for account roots', async () => {
    const markdown = await exportToMarkdown({
      selectedBookmarks: null,
      ...flags,
      hideOtherBookmarks: true,
      hideParentFolder: true,
    })

    expect(markdown).toContain('Account bar')
    expect(markdown).not.toContain('Account other')
    expect(markdown).not.toContain('Sub')
  })

  it('CSV uses localized root labels for account roots', async () => {
    const csv = await exportToCSV({
      selectedBookmarks: null,
      includeIconData: false,
      includeDateAdded: false,
      includeDateLastUsed: false,
      hideParentFolder: false,
    })

    expect(csv).not.toContain('Account bar')
    expect(csv).not.toContain('Account other')
  })
})
