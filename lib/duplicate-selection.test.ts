import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  deleteBookmarksById,
  getCopyIdsToDelete,
  getKeptCopyId,
  getReviewedIdsStillToDelete,
} from './duplicate-selection'
import { findDuplicateGroups } from './duplicates'

const groups = findDuplicateGroups([
  { id: 'a', title: 'A', url: 'https://x.com/', dateAdded: 2 },
  { id: 'b', title: 'B', url: 'https://www.x.com', dateAdded: 1 },
  { id: 'c', title: 'C', url: 'https://x.com#f', dateAdded: 3 },
  { id: 'd', title: 'D', url: 'https://y.com', dateAdded: 1 },
  { id: 'e', title: 'E', url: 'https://y.com', dateAdded: 2 },
])

describe('duplicate selection', () => {
  it('keeps the oldest copy by default', () => {
    expect(getKeptCopyId(groups[0]!, {})).toBe('b')
    expect(getCopyIdsToDelete(groups, {})).toEqual(['a', 'c', 'e'])
  })

  it('honours an explicit choice', () => {
    expect(getCopyIdsToDelete(groups, { 'https://x.com': 'c' })).toEqual([
      'b',
      'a',
      'e',
    ])
  })

  it('falls back to the oldest when the chosen copy is gone', () => {
    expect(getKeptCopyId(groups[1]!, { 'https://y.com': 'zzz' })).toBe('d')
  })
})

describe('managed copies', () => {
  const managedGroups = findDuplicateGroups([
    { id: 'a', title: 'A', url: 'https://x.com', dateAdded: 1 },
    {
      id: 'b',
      title: 'B',
      url: 'https://x.com',
      dateAdded: 2,
      unmodifiable: 'managed',
    },
    { id: 'c', title: 'C', url: 'https://x.com', dateAdded: 3 },
  ])

  it('never marks a managed copy for deletion', () => {
    expect(getCopyIdsToDelete(managedGroups, {})).toEqual(['c'])
  })
})

describe('getReviewedIdsStillToDelete', () => {
  it('drops copies added after the review', () => {
    const fresh = findDuplicateGroups([
      { id: 'a', title: 'A', url: 'https://x.com', dateAdded: 1 },
      { id: 'b', title: 'B', url: 'https://x.com', dateAdded: 2 },
      { id: 'new', title: 'N', url: 'https://x.com', dateAdded: 3 },
    ])
    expect(getReviewedIdsStillToDelete(['b'], fresh, {})).toEqual(['b'])
  })

  it('drops reviewed ids the fresh scan no longer deletes', () => {
    const fresh = findDuplicateGroups([
      { id: 'a', title: 'A', url: 'https://x.com', dateAdded: 1 },
    ])
    expect(getReviewedIdsStillToDelete(['b'], fresh, {})).toEqual([])
  })
})

describe('deleteBookmarksById', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    vi.restoreAllMocks()
  })

  it('continues past failures and reports both counts', async () => {
    const remove = vi
      .spyOn(fakeBrowser.bookmarks, 'remove')
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce()
    await expect(deleteBookmarksById(['1', '2', '3'])).resolves.toEqual({
      deleted: 2,
      failed: 1,
    })
    expect(remove).toHaveBeenCalledTimes(3)
  })
})

describe('managed keeper default', () => {
  it('keeps the oldest modifiable copy when the oldest is managed', () => {
    const [group] = findDuplicateGroups([
      {
        id: 'm',
        title: 'M',
        url: 'https://x.com',
        dateAdded: 1,
        unmodifiable: 'managed',
      },
      { id: 'a', title: 'A', url: 'https://x.com', dateAdded: 2 },
      { id: 'b', title: 'B', url: 'https://x.com', dateAdded: 3 },
    ])
    expect(getKeptCopyId(group!, {})).toBe('a')
    expect(getCopyIdsToDelete([group!], {})).toEqual(['b'])
  })

  it('keeps the oldest copy when every copy is managed', () => {
    const [group] = findDuplicateGroups([
      {
        id: 'm1',
        title: 'M1',
        url: 'https://x.com',
        dateAdded: 1,
        unmodifiable: 'managed',
      },
      {
        id: 'm2',
        title: 'M2',
        url: 'https://x.com',
        dateAdded: 2,
        unmodifiable: 'managed',
      },
    ])
    expect(getKeptCopyId(group!, {})).toBe('m1')
  })
})
