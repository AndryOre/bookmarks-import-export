import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { getImportPreview } from './import-preview'
import { importFromJSON } from './importers/import-json'
import { getReplaceDiff } from './replace-diff'
import { captureSafetySnapshot, restoreSafetySnapshot } from './safety-snapshot'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from './testing/fake-bookmarks'
import type { ParsedBookmark } from './types'

vi.mock('./offscreen-download', () => ({
  downloadViaOffscreenDocument: vi.fn(async () => 1),
}))

function link(title: string): ParsedBookmark {
  return {
    title,
    url: `https://${title.toLowerCase()}.example/`,
    dateAdded: 1,
  }
}

function titlesUnder(rootId: string): string[] {
  const root = getFakeBookmarksRoot().children?.find(
    (node) => node.id === rootId,
  )
  return (root?.children ?? []).map((node) => node.title)
}

async function addLink(parentId: string, title: string): Promise<void> {
  await fakeBrowser.bookmarks.create({
    parentId,
    title,
    url: `https://${title.toLowerCase()}.example/`,
  })
}

async function seedLive(): Promise<void> {
  await addLink('1', 'LocalBar')
  await addLink('2', 'LocalOther')
  await addLink('acct-1', 'AcctBar')
  await addLink('acct-2', 'AcctOther')
}

function exportedRoot(
  id: string,
  folderType: 'bookmarks-bar' | 'other',
  isSyncing: boolean,
  title: string,
): ParsedBookmark {
  return {
    id,
    title: folderType === 'other' ? 'Other bookmarks' : 'Bookmarks bar',
    folderType,
    syncing: isSyncing,
    dateAdded: 1,
    children: [link(title)],
  }
}

function twoSetExport(): ParsedBookmark[] {
  return [
    exportedRoot('1', 'bookmarks-bar', false, 'FreshLocalBar'),
    exportedRoot('2', 'other', false, 'FreshLocalOther'),
    exportedRoot('acct-1', 'bookmarks-bar', true, 'FreshAcctBar'),
    exportedRoot('acct-2', 'other', true, 'FreshAcctOther'),
  ]
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeBookmarks({ withAccountRoots: true })
})

describe('Restore-replace with account roots', () => {
  it('keeps a JSON with two bars separate and clears both sets', async () => {
    await seedLive()

    await importFromJSON(twoSetExport(), 'restore-replace')

    expect(titlesUnder('1')).toEqual(['FreshLocalBar'])
    expect(titlesUnder('acct-1')).toEqual(['FreshAcctBar'])
    expect(titlesUnder('2')).toEqual(['FreshLocalOther'])
    expect(titlesUnder('acct-2')).toEqual(['FreshAcctOther'])
  })

  it('does not duplicate bookmarks when re-importing a two-set export in merge mode', async () => {
    await importFromJSON(twoSetExport(), 'restore-merge')

    expect(titlesUnder('1')).toEqual(['FreshLocalBar'])
    expect(titlesUnder('acct-1')).toEqual(['FreshAcctBar'])
  })

  it('writes a single-bar file into the visible account set only', async () => {
    await seedLive()

    await importFromJSON(
      [
        {
          id: '1',
          title: 'Bookmarks bar',
          isBookmarksBar: true,
          dateAdded: 1,
          children: [link('Only')],
        },
      ],
      'restore-replace',
    )

    expect(titlesUnder('acct-1')).toEqual(['Only'])
    expect(titlesUnder('1')).toEqual(['LocalBar'])
  })
})

describe('Safety snapshot with account roots', () => {
  it('captures every root set and restores each to its own root', async () => {
    await seedLive()

    const snapshot = await captureSafetySnapshot()
    expect(snapshot.roots).toHaveLength(4)

    await addLink('1', 'Stray')
    await addLink('acct-1', 'StrayAcct')

    await restoreSafetySnapshot(snapshot)

    expect(titlesUnder('1')).toEqual(['LocalBar'])
    expect(titlesUnder('acct-1')).toEqual(['AcctBar'])
    expect(titlesUnder('2')).toEqual(['LocalOther'])
    expect(titlesUnder('acct-2')).toEqual(['AcctOther'])
  })
})

describe('getReplaceDiff with account roots', () => {
  it('counts only the visible set for a single-set file', async () => {
    await seedLive()
    const preview = getImportPreview(
      JSON.stringify([
        {
          id: '1',
          title: 'Bookmarks bar',
          dateAdded: 1,
          children: [link('Only')],
        },
      ]),
      'application/json',
    )

    expect(await getReplaceDiff(preview)).toEqual({
      removedCount: 2,
      addedCount: 1,
    })
  })

  it('counts both sets when the file carries both', async () => {
    await seedLive()
    const preview = getImportPreview(
      JSON.stringify(twoSetExport()),
      'application/json',
    )

    expect(await getReplaceDiff(preview)).toEqual({
      removedCount: 4,
      addedCount: 4,
    })
  })
})
