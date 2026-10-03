import { describe, expect, it } from 'vitest'

import { countBookmarks, countImportableBookmarks } from '@/lib/count-bookmarks'

describe('countBookmarks', () => {
  it('counts only url nodes across nested folders', () => {
    const tree = [
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bar',
            children: [
              { id: '3', title: 'A', url: 'https://a.example/' },
              {
                id: '4',
                title: 'Sub',
                children: [{ id: '5', title: 'B', url: 'https://b.example/' }],
              },
            ],
          },
          { id: '2', title: 'Other', children: [] },
        ],
      },
    ]
    expect(countBookmarks(tree)).toBe(2)
  })

  it('returns zero for an empty tree', () => {
    expect(countBookmarks([])).toBe(0)
  })
})

describe('countImportableBookmarks', () => {
  it('counts only nodes whose url is allowed', () => {
    const tree = [
      {
        title: 'Folder',
        children: [
          { title: 'A', url: 'https://a.example' },
          { title: 'Bad', url: 'javascript:alert(1)' },
          { title: 'Local', url: 'chrome://settings' },
        ],
      },
    ]
    expect(countImportableBookmarks(tree)).toBe(1)
  })
})
