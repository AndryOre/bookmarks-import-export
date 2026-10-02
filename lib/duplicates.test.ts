import { beforeEach, describe, expect, it } from 'vitest'

import { findDuplicateGroups, normalizeUrl } from '@/lib/duplicates'
import {
  getFakeBookmarksRoot,
  resetFakeBookmarks,
} from '@/lib/testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

describe('normalizeUrl', () => {
  it('lowercases scheme and host', () => {
    expect(normalizeUrl('HTTPS://Example.COM/Path')).toBe(
      'https://example.com/Path',
    )
  })

  it('treats http as https', () => {
    // eslint-disable-next-line unicorn/prefer-https -- http is the scheme under test
    expect(normalizeUrl('http://example.com/a')).toBe(
      normalizeUrl('https://example.com/a'),
    )
  })

  it('ignores a leading www.', () => {
    expect(normalizeUrl('https://www.example.com/a')).toBe(
      normalizeUrl('https://example.com/a'),
    )
  })

  it('ignores a trailing slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe(
      normalizeUrl('https://example.com'),
    )
    expect(normalizeUrl('https://example.com/a/')).toBe(
      normalizeUrl('https://example.com/a'),
    )
  })

  it('ignores the fragment', () => {
    expect(normalizeUrl('https://example.com/a#top')).toBe(
      normalizeUrl('https://example.com/a'),
    )
  })

  it('preserves the query string', () => {
    expect(normalizeUrl('https://example.com/a?q=1')).not.toBe(
      normalizeUrl('https://example.com/a?q=2'),
    )
    expect(normalizeUrl('https://example.com/a/?q=1#x')).toBe(
      'https://example.com/a?q=1',
    )
  })

  it('returns a stable fallback for an invalid URL', () => {
    expect(normalizeUrl('  Not A URL ')).toBe('not a url')
    expect(normalizeUrl('Not A URL')).toBe(normalizeUrl(' not a url'))
  })
})

function treeWith(
  barChildren: ExtendedBookmarkTreeNode[],
  otherChildren: ExtendedBookmarkTreeNode[] = [],
): ExtendedBookmarkTreeNode[] {
  const root = getFakeBookmarksRoot()
  const [bar, other] = root.children ?? []
  if (bar) bar.children = barChildren
  if (other) other.children = otherChildren
  return [root]
}

const bookmark = (
  id: string,
  url: string,
  dateAdded?: number,
): ExtendedBookmarkTreeNode => ({
  id,
  title: `Title ${id}`,
  url,
  syncing: false,
  dateAdded,
})

const folder = (
  id: string,
  title: string,
  children: ExtendedBookmarkTreeNode[] = [],
): ExtendedBookmarkTreeNode => ({ id, title, syncing: false, children })

describe('findDuplicateGroups', () => {
  beforeEach(() => {
    resetFakeBookmarks()
  })

  it('returns no groups when nothing is duplicated', () => {
    const tree = treeWith([
      bookmark('10', 'https://a.example/'),
      bookmark('11', 'https://b.example/'),
    ])
    expect(findDuplicateGroups(tree)).toEqual([])
  })

  it('groups two copies and carries title, folder path and date', () => {
    const tree = treeWith([
      bookmark('10', 'https://a.example/', 100),
      // eslint-disable-next-line unicorn/prefer-https -- http is the scheme under test
      folder('20', 'Sub', [bookmark('11', 'http://www.a.example', 50)]),
    ])
    const groups = findDuplicateGroups(tree)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.normalizedUrl).toBe('https://a.example')
    expect(groups[0]?.copies.map((copy) => copy.id)).toEqual(['11', '10'])
    expect(groups[0]?.copies[0]).toMatchObject({
      title: 'Title 11',
      folderPath: ['Bookmarks bar', 'Sub'],
      dateAdded: 50,
    })
  })

  it('groups three copies across different roots, oldest first', () => {
    const tree = treeWith(
      [bookmark('10', 'https://a.example/#x', 300)],
      [
        bookmark('11', 'https://A.example', 100),
        bookmark('12', 'https://a.example/', 200),
      ],
    )
    const [group] = findDuplicateGroups(tree)
    expect(group?.copies.map((copy) => copy.id)).toEqual(['11', '12', '10'])
    expect(group?.copies[0]?.folderPath).toEqual(['Other bookmarks'])
  })

  it('never compares folders', () => {
    const tree = treeWith([folder('20', 'Same'), folder('21', 'Same')])
    expect(findDuplicateGroups(tree)).toEqual([])
  })
})
