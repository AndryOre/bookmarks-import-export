import type { BookmarkNode } from '@/lib/types'

/**
 * One visible row of the bookmark tree, flattened with the ARIA metadata
 * (`aria-level`, `aria-setsize`, `aria-posinset`) a `treeitem` needs.
 */
export interface FlatTreeRow {
  node: BookmarkNode
  parentId: string | undefined
  /**
   * 1-based nesting depth, as `aria-level` expects.
   */
  level: number
  /**
   * Number of siblings, including this row.
   */
  setSize: number
  /**
   * 1-based position among siblings.
   */
  position: number
  isFolder: boolean
  isExpanded: boolean
}

/**
 * The effect of a navigation key press: move focus to a row, or expand or
 * collapse the focused folder.
 */
export type TreeKeyAction =
  | { type: 'focus'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }

/**
 * Flattens the tree into the rows that are currently visible: a folder's
 * children appear only while the folder is expanded.
 * @param nodes The nodes to flatten.
 * @param expandedFolders Ids of the expanded folders.
 * @param level The 1-based depth of `nodes`.
 * @param parentId The id of the folder that owns `nodes`, if any.
 * @returns The visible rows in document order.
 */
export function flattenVisibleRows(
  nodes: BookmarkNode[],
  expandedFolders: ReadonlySet<string>,
  level = 1,
  parentId?: string,
): FlatTreeRow[] {
  const rows: FlatTreeRow[] = []
  for (const [index, node] of nodes.entries()) {
    const isFolder = !node.url
    const isExpanded = isFolder && expandedFolders.has(node.id)
    rows.push({
      node,
      parentId,
      level,
      setSize: nodes.length,
      position: index + 1,
      isFolder,
      isExpanded,
    })
    if (isExpanded && node.children) {
      rows.push(
        ...flattenVisibleRows(
          node.children,
          expandedFolders,
          level + 1,
          node.id,
        ),
      )
    }
  }
  return rows
}

/**
 * Maps a WAI-ARIA tree navigation key (Up/Down/Left/Right/Home/End) pressed
 * on the focused row to the action it triggers.
 * @param rows The visible rows from {@link flattenVisibleRows}.
 * @param focusedId Id of the row that has focus.
 * @param key The `KeyboardEvent.key` value.
 * @returns The action to perform, or `undefined` when the key does nothing here.
 */
export function resolveTreeKey(
  rows: readonly FlatTreeRow[],
  focusedId: string,
  key: string,
): TreeKeyAction | undefined {
  const index = rows.findIndex((row) => row.node.id === focusedId)
  const current = rows[index]
  if (!current) return undefined

  const focusAt = (target: number): TreeKeyAction | undefined => {
    const row = rows[target]
    return row && target !== index
      ? { type: 'focus', id: row.node.id }
      : undefined
  }

  switch (key) {
    case 'ArrowDown': {
      return focusAt(index + 1)
    }
    case 'ArrowUp': {
      return focusAt(index - 1)
    }
    case 'Home': {
      return focusAt(0)
    }
    case 'End': {
      return focusAt(rows.length - 1)
    }
    case 'ArrowRight': {
      if (!current.isFolder) return undefined
      if (!current.isExpanded) return { type: 'expand', id: current.node.id }
      const next = rows[index + 1]
      return next?.parentId === current.node.id
        ? { type: 'focus', id: next.node.id }
        : undefined
    }
    case 'ArrowLeft': {
      if (current.isExpanded) return { type: 'collapse', id: current.node.id }
      return current.parentId
        ? { type: 'focus', id: current.parentId }
        : undefined
    }
    default: {
      return undefined
    }
  }
}

/**
 * Adds a pinned row index to the indexes a virtualized list renders, keeping
 * the result sorted and free of duplicates. Used to keep the roving-tabindex
 * row mounted even when it has scrolled out of the rendered window, so the
 * tree always has a tab stop in the DOM.
 * @param renderedIndexes Indexes the virtualizer would render, ascending.
 * @param pinnedIndex Index that must stay rendered, or `-1` for none.
 * @returns The indexes to render.
 */
export function withPinnedIndex(
  renderedIndexes: readonly number[],
  pinnedIndex: number,
): number[] {
  const shouldPin = pinnedIndex >= 0 && !renderedIndexes.includes(pinnedIndex)
  return shouldPin
    ? [...renderedIndexes, pinnedIndex].toSorted((a, b) => a - b)
    : [...renderedIndexes]
}
