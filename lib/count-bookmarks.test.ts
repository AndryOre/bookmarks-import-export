import { describe, expect, it } from 'vitest'

import { countBookmarks } from '@/lib/count-bookmarks'

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
