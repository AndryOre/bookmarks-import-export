import { describe, expect, it } from 'vitest'

import {
  flattenVisibleRows,
  resolveTreeKey,
  withPinnedIndex,
} from './tree-navigation'
import type { BookmarkNode } from './types'

const nodes: BookmarkNode[] = [
  {
    id: 'a',
    title: 'A',
    children: [
      { id: 'a1', title: 'A1', url: 'https://a1.test' },
      { id: 'a2', title: 'A2', children: [] },
    ],
  },
  { id: 'b', title: 'B', url: 'https://b.test' },
]

describe('flattenVisibleRows', () => {
  it('lists only top-level rows when every folder is collapsed', () => {
    const rows = flattenVisibleRows(nodes, new Set())
    expect(rows.map((row) => row.node.id)).toEqual(['a', 'b'])
  })

  it('includes children of expanded folders with level and position metadata', () => {
    const rows = flattenVisibleRows(nodes, new Set(['a']))
    expect(
      rows.map((row) => [row.node.id, row.level, row.setSize, row.position]),
    ).toEqual([
      ['a', 1, 2, 1],
      ['a1', 2, 2, 1],
      ['a2', 2, 2, 2],
      ['b', 1, 2, 2],
    ])
    expect(rows[1]?.parentId).toBe('a')
    expect(rows[0]?.isExpanded).toBe(true)
    expect(rows[3]?.isFolder).toBe(false)
  })
})

describe('resolveTreeKey', () => {
  const rows = flattenVisibleRows(nodes, new Set(['a']))

  it('moves focus with ArrowDown and ArrowUp, clamped at the ends', () => {
    expect(resolveTreeKey(rows, 'a', 'ArrowDown')).toEqual({
      type: 'focus',
      id: 'a1',
    })
    expect(resolveTreeKey(rows, 'a', 'ArrowUp')).toBeUndefined()
    expect(resolveTreeKey(rows, 'b', 'ArrowDown')).toBeUndefined()
  })

  it('jumps with Home and End', () => {
    expect(resolveTreeKey(rows, 'a2', 'Home')).toEqual({
      type: 'focus',
      id: 'a',
    })
    expect(resolveTreeKey(rows, 'a', 'End')).toEqual({ type: 'focus', id: 'b' })
  })

  it('ArrowRight expands a collapsed folder, then enters it', () => {
    const collapsed = flattenVisibleRows(nodes, new Set())
    expect(resolveTreeKey(collapsed, 'a', 'ArrowRight')).toEqual({
      type: 'expand',
      id: 'a',
    })
    expect(resolveTreeKey(rows, 'a', 'ArrowRight')).toEqual({
      type: 'focus',
      id: 'a1',
    })
    expect(resolveTreeKey(rows, 'b', 'ArrowRight')).toBeUndefined()
  })

  it('ArrowRight on an expanded empty folder does nothing', () => {
    const withEmpty = flattenVisibleRows(nodes, new Set(['a', 'a2']))
    expect(resolveTreeKey(withEmpty, 'a2', 'ArrowRight')).toBeUndefined()
  })

  it('ArrowLeft collapses an expanded folder, otherwise goes to the parent', () => {
    expect(resolveTreeKey(rows, 'a', 'ArrowLeft')).toEqual({
      type: 'collapse',
      id: 'a',
    })
    expect(resolveTreeKey(rows, 'a1', 'ArrowLeft')).toEqual({
      type: 'focus',
      id: 'a',
    })
    expect(resolveTreeKey(rows, 'b', 'ArrowLeft')).toBeUndefined()
  })

  it('ignores unrelated keys and unknown focus ids', () => {
    expect(resolveTreeKey(rows, 'a', 'x')).toBeUndefined()
    expect(resolveTreeKey(rows, 'missing', 'ArrowDown')).toBeUndefined()
  })
})

describe('withPinnedIndex', () => {
  it('appends a pinned index outside the rendered window in order', () => {
    expect(withPinnedIndex([5, 6, 7], 0)).toEqual([0, 5, 6, 7])
    expect(withPinnedIndex([5, 6, 7], 40)).toEqual([5, 6, 7, 40])
  })

  it('does not duplicate an index already rendered or add a missing pin', () => {
    expect(withPinnedIndex([5, 6, 7], 6)).toEqual([5, 6, 7])
    expect(withPinnedIndex([5, 6, 7], -1)).toEqual([5, 6, 7])
  })
})
