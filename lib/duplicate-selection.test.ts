import { describe, expect, it } from 'vitest'

import { getCopyIdsToDelete, getKeptCopyId } from './duplicate-selection'
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
