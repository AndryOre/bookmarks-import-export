// @vitest-environment jsdom
import { act, createElement, createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'
import type { BookmarkTreeHandle } from '@/lib/types'

import { BookmarkTree } from './bookmark-tree'

const mountedHarnesses: DomHarness[] = []

function noop() {}

function seed() {
  const tree = [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '10',
          title: 'Work Folder',
          children: [
            { id: '11', title: 'Ticket', url: 'https://example.com/ticket' },
            { id: '12', title: 'Doc', url: 'https://example.com/doc' },
          ],
        },
        { id: '13', title: 'Recipe', url: 'https://example.com/recipe' },
      ],
    },
  ]
  for (const event of [
    fakeBrowser.bookmarks.onCreated,
    fakeBrowser.bookmarks.onRemoved,
    fakeBrowser.bookmarks.onChanged,
    fakeBrowser.bookmarks.onMoved,
  ]) {
    event.addListener = vi.fn()
    event.removeListener = vi.fn()
  }
  fakeBrowser.bookmarks.getTree = vi.fn(async () =>
    structuredClone(tree),
  ) as unknown as typeof fakeBrowser.bookmarks.getTree
}

async function mountTree(searchTerm: string) {
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  const reference = createRef<BookmarkTreeHandle>()
  let selectedCount = 0
  const element = (term: string) =>
    createElement(BookmarkTree, {
      ref: reference,
      searchTerm: term,
      onSelectionChange: (count: number) => {
        selectedCount = count
      },
      onTotalChange: noop,
    })
  await harness.render(element(searchTerm))
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  return {
    harness,
    reference,
    rerender: (term: string) => harness.render(element(term)),
    getSelectedCount: () => selectedCount,
  }
}

function rowTitles(container: HTMLElement) {
  return [...container.querySelectorAll('[role="treeitem"]')].map((row) =>
    row.getAttribute('aria-label'),
  )
}

describe('BookmarkTree', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    fakeBrowser.i18n.getMessage = vi.fn(
      (key: string) => key,
    ) as typeof fakeBrowser.i18n.getMessage
    seed()
    for (const property of ['offsetHeight', 'offsetWidth']) {
      Object.defineProperty(HTMLElement.prototype, property, {
        configurable: true,
        value: 600,
      })
    }
  })

  afterEach(() => {
    for (const harness of mountedHarnesses.splice(0)) harness.unmount()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('selects only visible bookmarks when select-all runs during a search', async () => {
    const { reference, getSelectedCount } = await mountTree('recipe')

    await act(async () => reference.current?.selectAll())

    expect(getSelectedCount()).toBe(1)
  })

  it('keeps selections outside the search when select-all runs during a search', async () => {
    const { reference, rerender, getSelectedCount } = await mountTree('')
    await act(async () => reference.current?.selectAll())
    await act(async () => reference.current?.deselectAll())
    await rerender('recipe')
    await act(async () => reference.current?.selectAll())
    await rerender('doc')
    await act(async () => reference.current?.selectAll())

    expect(getSelectedCount()).toBe(2)
  })

  it('lets the master toggle clear only the visible bookmarks during a search', async () => {
    const { reference, rerender, getSelectedCount } = await mountTree('')
    await act(async () => reference.current?.selectAll())
    await rerender('recipe')

    expect(reference.current?.areAllVisibleSelected()).toBe(true)
    await act(async () => reference.current?.deselectAll())

    expect(getSelectedCount()).toBe(2)
    expect(reference.current?.areAllVisibleSelected()).toBe(false)
  })

  it('keeps every child of a folder whose own title matches', async () => {
    const { harness, reference, getSelectedCount } =
      await mountTree('work folder')

    expect(rowTitles(harness.container)).toEqual([
      'Work Folder',
      'Ticket',
      'Doc',
    ])

    await act(async () => reference.current?.selectAll())
    expect(getSelectedCount()).toBe(2)
  })

  it('exposes aria-checked on every row and never aria-selected', async () => {
    const { harness, reference } = await mountTree('')
    await act(async () => reference.current?.selectAll())

    const rows = [...harness.container.querySelectorAll('[role="treeitem"]')]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.hasAttribute('aria-selected')).toBe(false)
      expect(['true', 'false', 'mixed']).toContain(
        row.getAttribute('aria-checked'),
      )
    }
  })

  it('moves focus to the new active row when the focused row disappears', async () => {
    const { harness, rerender } = await mountTree('')
    const recipe = harness.container.querySelector<HTMLElement>(
      '[aria-label="Recipe"]',
    )
    await act(async () => recipe?.focus())
    expect(document.activeElement).toBe(recipe)

    await rerender('work folder')

    const first =
      harness.container.querySelector<HTMLElement>('[role="treeitem"]')
    expect(document.activeElement).toBe(first)
  })
})
