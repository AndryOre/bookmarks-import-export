import { describe, expect, it } from 'vitest'

import { resolveImportRoots } from './resolve-roots'

describe('resolveImportRoots', () => {
  it('resolves bar/Other/Mobile by folderType', () => {
    const result = resolveImportRoots([
      { id: 'a', folderType: 'other' },
      { id: 'b', folderType: 'bookmarks-bar' },
      { id: 'c', folderType: 'mobile' },
    ])

    expect(result).toEqual({
      bookmarksBarId: 'b',
      otherBookmarksId: 'a',
      mobileId: 'c',
    })
  })

  it('falls back to the fixed ids when folderType is absent', () => {
    const result = resolveImportRoots([{ id: '2' }, { id: '1' }, { id: '3' }])

    expect(result).toEqual({
      bookmarksBarId: '1',
      otherBookmarksId: '2',
      mobileId: '3',
    })
  })

  it('falls back to position when neither folderType nor the fixed ids match', () => {
    const result = resolveImportRoots([
      { id: 'unknown-a' },
      { id: 'unknown-b' },
      { id: 'unknown-c' },
    ])

    expect(result).toEqual({
      bookmarksBarId: 'unknown-a',
      otherBookmarksId: 'unknown-b',
      mobileId: 'unknown-c',
    })
  })

  it('leaves mobileId undefined when the browser has no Mobile root', () => {
    const result = resolveImportRoots([{ id: '1' }, { id: '2' }])

    expect(result.mobileId).toBeUndefined()
  })

  it('prefers folderType over a mismatched fixed id', () => {
    const result = resolveImportRoots([
      { id: '1', folderType: 'other' },
      { id: '2', folderType: 'bookmarks-bar' },
    ])

    expect(result).toEqual({
      bookmarksBarId: '2',
      otherBookmarksId: '1',
      mobileId: undefined,
    })
  })
})
