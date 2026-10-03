import { describe, expect, it } from 'vitest'

import { collectExistingUrls, dropDuplicateBookmarks } from './skip-duplicates'
import type { ParsedBookmark } from './types'

function bookmark(title: string, url: string): ParsedBookmark {
  return { title, url, dateAdded: 0 }
}

describe('collectExistingUrls', () => {
  it('collects normalized URLs from every folder of the tree', () => {
    const urls = collectExistingUrls([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bar',
            children: [
              // eslint-disable-next-line unicorn/prefer-https -- exercises http/https normalization
              { id: '5', title: 'A', url: 'http://www.a.example/' },
              {
                id: '6',
                title: 'Nested',
                children: [{ id: '7', title: 'B', url: 'https://b.example/x' }],
              },
            ],
          },
        ],
      },
    ])
    expect(urls).toEqual(new Set(['https://a.example', 'https://b.example/x']))
  })
})

describe('dropDuplicateBookmarks', () => {
  it('drops bookmarks whose normalized URL already exists, in any folder', () => {
    const known = new Set(['https://a.example'])
    const { nodes, skippedDuplicates } = dropDuplicateBookmarks(
      [
        bookmark('A', 'https://www.a.example/'),
        {
          title: 'Folder',
          dateAdded: 0,
          children: [
            // eslint-disable-next-line unicorn/prefer-https -- exercises http/https normalization
            bookmark('A2', 'http://a.example'),
            bookmark('C', 'https://c.example'),
          ],
        },
      ],
      known,
    )
    expect(skippedDuplicates).toBe(2)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.children?.map((child) => child.title)).toEqual(['C'])
  })

  it('collapses duplicates inside the imported file, keeping the first', () => {
    const { nodes, skippedDuplicates } = dropDuplicateBookmarks(
      [
        bookmark('First', 'https://d.example/p'),
        bookmark('Second', 'https://d.example/p/'),
      ],
      new Set(),
    )
    expect(skippedDuplicates).toBe(1)
    expect(nodes.map((node) => node.title)).toEqual(['First'])
  })

  it('keeps nodes without a usable URL and leaves the known set untouched', () => {
    const known = new Set<string>()
    const { nodes, skippedDuplicates } = dropDuplicateBookmarks(
      [
        bookmark('Bad', 'javascript:alert(1)'),
        bookmark('Bad2', 'javascript:alert(1)'),
      ],
      known,
    )
    expect(skippedDuplicates).toBe(0)
    expect(nodes).toHaveLength(2)
    expect(known.size).toBe(0)
  })
})
