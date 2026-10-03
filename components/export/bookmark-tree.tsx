import { i18n } from '#i18n'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import type { Browser } from '@wxt-dev/browser'
import { cn } from 'cn'
import { Check, File, Folder, Minus } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { getFaviconUrl } from '@/lib/favicon'
import { formatCount } from '@/lib/format-count'
import { autoExpandFoldersStore, showBookmarkIconStore } from '@/lib/storage'
import {
  flattenVisibleRows,
  resolveTreeKey,
  withPinnedIndex,
} from '@/lib/tree-navigation'
import type { FlatTreeRow } from '@/lib/tree-navigation'
import type {
  BookmarkNode,
  BookmarkTreeHandle,
  BookmarkTreeProperties,
  CheckedState,
  ExtendedBookmarkTreeNode,
} from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

/**
 * Renders the bookmark tree used by the Export page, following the WAI-ARIA
 * tree pattern: a single tab stop with roving focus, arrow-key navigation,
 * and selection exposed as `aria-checked` on each `treeitem`. Exposes an
 * imperative handle (see {@link BookmarkTreeHandle}) so the parent can drive
 * selection and refreshes without lifting the checked-state map into props.
 * Reloads itself when the browser's bookmarks change.
 */
export const BookmarkTree = forwardRef<
  BookmarkTreeHandle,
  BookmarkTreeProperties
>(function BookmarkTree(
  {
    searchTerm,
    onSelectionChange,
    onTotalChange,
    className,
    loadingState,
    emptyState,
    noBookmarksState,
    errorState,
  },
  reference,
) {
  const [nodes, setNodes] = useState<BookmarkNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  /**
   * Checked state for leaf (bookmark) nodes only, keyed by bookmark id.
   * Folder checked/indeterminate state is never stored here — it's derived
   * from descendant bookmarks at render time by `determineCheckedState`.
   */
  const [checkedState, setCheckedState] = useState<Map<string, boolean>>(
    new Map(),
  )
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [focusedId, setFocusedId] = useState<string | undefined>()
  const treeReference = useRef<HTMLDivElement>(null)
  const isFocusInTreeReference = useRef(false)
  const pendingFocusReference = useRef<string | undefined>(undefined)
  /**
   * Snapshot of `expandedFolders` from just before a search started, so it
   * can be restored once the search term is cleared. `null` means no
   * search-driven expansion is currently in effect.
   */
  const preSearchExpandedReference = useRef<Set<string> | null>(null)

  const [showBookmarkIcon] = useStorageItem(showBookmarkIconStore)
  const [autoExpandFolders] = useStorageItem(autoExpandFoldersStore)

  const loadBookmarks = useCallback(
    async (options: { shouldKeepExpansion?: boolean } = {}) => {
      try {
        const tree = await fetchFullTree()
        const rootNode = tree[0]
        const withParentId = addParentIds(rootNode?.children ?? [])
        setNodes(withParentId)
        setHasLoadError(false)
        setIsLoading(false)

        if (!autoExpandFolders || options.shouldKeepExpansion) return

        const allFolderIds = collectFolderIds(withParentId)
        setExpandedFolders(new Set(allFolderIds))
      } catch {
        setHasLoadError(true)
        setIsLoading(false)
      }
    },
    [autoExpandFolders],
  )

  const isSearching = searchTerm.trim() !== ''
  const visibleNodes = useMemo(
    () => (isSearching ? filterNodes(nodes, searchTerm) : nodes),
    [isSearching, nodes, searchTerm],
  )

  /**
   * The imperative API exposed to the parent via `ref` (see
   * {@link BookmarkTreeHandle}). Selection lives in this component's own
   * state, so the parent needs a way to trigger selection changes and
   * refreshes without owning the checked-state map itself.
   */
  useImperativeHandle(reference, () => ({
    selectAll: () => {
      const visibleBookmarkIds = collectBookmarkIds(visibleNodes)
      setCheckedState((previous) => {
        const next = new Map(previous)
        for (const id of visibleBookmarkIds) next.set(id, true)
        return next
      })
    },
    deselectAll: () => {
      if (!isSearching) {
        setCheckedState(new Map())
        return
      }
      const visibleBookmarkIds = collectBookmarkIds(visibleNodes)
      setCheckedState((previous) => {
        const next = new Map(previous)
        for (const id of visibleBookmarkIds) next.delete(id)
        return next
      })
    },
    areAllVisibleSelected: () => {
      const visibleBookmarkIds = collectBookmarkIds(visibleNodes)
      return (
        visibleBookmarkIds.length > 0 &&
        visibleBookmarkIds.every((id) => checkedState.get(id) === true)
      )
    },
    expandAll: () => {
      setExpandedFolders(new Set(collectFolderIds(nodes)))
    },
    collapseAll: () => {
      setExpandedFolders(new Set())
    },
    refresh: async () => {
      await loadBookmarks()
      setCheckedState(new Map())
    },
    /**
     * Re-fetches the live bookmark tree — rather than reusing the `nodes`
     * state, which may be stale relative to the browser — and prunes it
     * down to just the checked ids, so exports always reflect the
     * browser's current bookmarks.
     * @returns The selected bookmarks, pruned to the minimal containing folders.
     */
    getSelectedBookmarks: async () => {
      const tree = await fetchFullTree()
      return pruneTree(tree, checkedState)
    },
  }))

  useEffect(() => {
    const load = async () => {
      await loadBookmarks()
    }
    void load()
  }, [loadBookmarks])

  /**
   * Reloads the tree (keeping the user's expansion) whenever the browser
   * adds, removes, edits or moves a bookmark, coalescing bursts such as an
   * import into a single reload.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void loadBookmarks({ shouldKeepExpansion: true })
      }, BOOKMARK_CHANGE_DEBOUNCE_MS)
    }
    const events = [
      browser.bookmarks.onCreated,
      browser.bookmarks.onRemoved,
      browser.bookmarks.onChanged,
      browser.bookmarks.onMoved,
    ]
    for (const event of events) event.addListener(scheduleReload)
    return () => {
      clearTimeout(timer)
      for (const event of events) event.removeListener(scheduleReload)
    }
  }, [loadBookmarks])

  /**
   * Drives the search UX: while a search term is active, expands every
   * folder that contains a match, after first snapshotting the
   * then-current expanded set into `preSearchExpandedReference`. Once the
   * term is cleared, restores that snapshot instead of leaving the
   * search-driven expansion in place.
   */
  useEffect(() => {
    if (!searchTerm.trim()) {
      if (preSearchExpandedReference.current !== null) {
        setExpandedFolders(preSearchExpandedReference.current)
        preSearchExpandedReference.current = null
      }
      return
    }
    setExpandedFolders((current) => {
      if (preSearchExpandedReference.current === null) {
        preSearchExpandedReference.current = new Set(current)
      }
      return new Set(findAncestorsOfMatches(nodes, searchTerm))
    })
  }, [searchTerm, nodes])

  useEffect(() => {
    const total = collectBookmarkIds(nodes).length
    onTotalChange(total)
  }, [nodes, onTotalChange])

  useEffect(() => {
    const count = countChecked(nodes, checkedState)
    onSelectionChange(count)
  }, [checkedState, nodes, onSelectionChange])

  const rows = useMemo(
    () => flattenVisibleRows(visibleNodes, expandedFolders),
    [visibleNodes, expandedFolders],
  )
  const activeId = rows.some((row) => row.node.id === focusedId)
    ? focusedId
    : rows[0]?.node.id

  const activeIndex = rows.findIndex((row) => row.node.id === activeId)
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual's documented hook; its returned functions are not passed to memoized children
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => treeReference.current,
    estimateSize: () => TREE_ROW_HEIGHT_PX,
    getItemKey: (index) => rows[index]?.node.id ?? index,
    overscan: TREE_OVERSCAN_ROWS,
    rangeExtractor: (range) =>
      withPinnedIndex(defaultRangeExtractor(range), activeIndex),
  })

  /**
   * Restores keyboard focus when the focused row leaves the tree (a search
   * excludes it or the bookmark is deleted) while focus was inside the tree:
   * the browser would otherwise drop focus to the body.
   */
  useEffect(() => {
    if (activeId === undefined || !isFocusInTreeReference.current) return
    const activeElement = document.activeElement
    if (activeElement && activeElement !== document.body) return
    pendingFocusReference.current = activeId
  }, [rows, activeId])

  useEffect(() => {
    const pendingId = pendingFocusReference.current
    if (pendingId === undefined) return
    const target = [
      ...(treeReference.current?.querySelectorAll<HTMLElement>(
        '[role="treeitem"]',
      ) ?? []),
    ].find((element) => element.dataset.nodeId === pendingId)
    if (!target) return
    pendingFocusReference.current = undefined
    target.focus()
  })

  function handleToggleExpand(id: string) {
    setExpandedFolders((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setFolderExpanded(id: string, isExpanded: boolean) {
    setExpandedFolders((previous) => {
      const next = new Set(previous)
      if (isExpanded) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleToggleSelection(node: BookmarkNode) {
    const current = node.url
      ? (checkedState.get(node.id) ?? false)
      : determineCheckedState(node.children ?? [], checkedState)
    const isChecked = current !== true

    setCheckedState((previous) => {
      const next = new Map(previous)
      if (node.url) {
        next.set(node.id, isChecked)
      } else {
        const descendants = collectBookmarkIds(node.children ?? [])
        for (const id of descendants) next.set(id, isChecked)
      }
      return next
    })
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    row: FlatTreeRow,
  ) {
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey
    if (hasModifier || event.target !== event.currentTarget) return

    if (event.key === ' ') {
      event.preventDefault()
      handleToggleSelection(row.node)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (row.isFolder) handleToggleExpand(row.node.id)
      return
    }

    const action = resolveTreeKey(rows, row.node.id, event.key)
    if (!action) return
    event.preventDefault()
    if (action.type === 'focus') {
      pendingFocusReference.current = action.id
      setFocusedId(action.id)
    } else {
      setFolderExpanded(action.id, action.type === 'expand')
    }
  }

  function handleRetry() {
    setHasLoadError(false)
    setIsLoading(true)
    void loadBookmarks()
  }

  if (hasLoadError && errorState) return errorState(handleRetry)
  if (isLoading && loadingState) return loadingState

  if (
    noBookmarksState &&
    !isLoading &&
    collectBookmarkIds(nodes).length === 0
  ) {
    return noBookmarksState
  }

  if (emptyState && isSearching && visibleNodes.length === 0) {
    return emptyState
  }

  return (
    <div
      ref={treeReference}
      role="tree"
      aria-label={i18n.t('exportPage_treeLabel')}
      aria-multiselectable="true"
      onFocus={() => {
        isFocusInTreeReference.current = true
      }}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && !event.currentTarget.contains(next)) {
          isFocusInTreeReference.current = false
        }
      }}
      className={cn('flex-1 overflow-auto p-2', className)}
    >
      <div
        className="relative h-(--tree-height) w-full"
        style={
          {
            '--tree-height': `${virtualizer.getTotalSize()}px`,
          } as React.CSSProperties
        }
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          if (!row) return null
          return (
            <TreeRow
              key={row.node.id}
              row={row}
              offset={virtualRow.start}
              checked={
                row.node.url
                  ? (checkedState.get(row.node.id) ?? false)
                  : determineCheckedState(row.node.children ?? [], checkedState)
              }
              isTabStop={row.node.id === activeId}
              showBookmarkIcon={showBookmarkIcon}
              onFocusRow={setFocusedId}
              onToggleExpand={handleToggleExpand}
              onToggleSelection={handleToggleSelection}
              onKeyDown={handleRowKeyDown}
            />
          )
        })}
      </div>
    </div>
  )
})

const BOOKMARK_CHANGE_DEBOUNCE_MS = 150
const TREE_ROW_HEIGHT_PX = 30
const TREE_OVERSCAN_ROWS = 10

interface TreeRowProperties {
  row: FlatTreeRow
  offset: number
  checked: CheckedState
  isTabStop: boolean
  showBookmarkIcon: boolean
  onFocusRow: (id: string) => void
  onToggleExpand: (id: string) => void
  onToggleSelection: (node: BookmarkNode) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>, row: FlatTreeRow) => void
}

function TreeRow({
  row,
  offset,
  checked,
  isTabStop,
  showBookmarkIcon,
  onFocusRow,
  onToggleExpand,
  onToggleSelection,
  onKeyDown,
}: TreeRowProperties) {
  const { node, level, isFolder, isExpanded } = row

  return (
    <div
      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- ARIA 1.2 makes aria-checked the supported selection state for a multiselectable tree; aria-selected is optional
      role="treeitem"
      aria-label={node.title}
      aria-level={level}
      aria-setsize={row.setSize}
      aria-posinset={row.position}
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
      tabIndex={isTabStop ? 0 : -1}
      data-node-id={node.id}
      className="absolute inset-x-0 top-0 ml-(--tree-indent) flex h-7.5 translate-y-(--tree-offset) cursor-pointer items-center gap-1.5 rounded px-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      style={
        {
          '--tree-indent': `${(level - 1) * 16}px`,
          '--tree-offset': `${offset}px`,
        } as React.CSSProperties
      }
      onFocus={(event) => {
        if (event.target === event.currentTarget) onFocusRow(node.id)
      }}
      onClick={() => {
        if (isFolder) onToggleExpand(node.id)
        else onToggleSelection(node)
      }}
      onKeyDown={(event) => onKeyDown(event, row)}
    >
      <TreeCheckMark
        checked={checked}
        onToggle={() => onToggleSelection(node)}
      />

      {node.url ? (
        showBookmarkIcon ? (
          <img
            src={getFaviconUrl(node.url)}
            alt=""
            className="size-4 shrink-0"
            aria-hidden="true"
            onError={(event) => {
              ;(event.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <File
            className="size-4 shrink-0 text-bookmark-file"
            aria-hidden="true"
          />
        )
      ) : (
        <Folder
          className="size-4 shrink-0 text-bookmark-folder"
          fill="currentColor"
          aria-hidden="true"
        />
      )}

      <span className="min-w-0 flex-1 truncate text-sm">{node.title}</span>

      {isFolder && (
        <span
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
          aria-hidden="true"
        >
          {formatCount(collectBookmarkIds(node.children ?? []).length)}
        </span>
      )}
    </div>
  )
}

function TreeCheckMark({
  checked,
  onToggle,
}: {
  checked: CheckedState
  onToggle: () => void
}) {
  const state = checked === 'indeterminate' ? 'mixed' : String(checked)
  return (
    <span
      aria-hidden="true"
      data-checked={state}
      className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-input transition-colors data-[checked=mixed]:border-primary data-[checked=mixed]:bg-primary data-[checked=mixed]:text-primary-foreground data-[checked=true]:border-primary data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground dark:bg-input/30"
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      {checked === 'indeterminate' ? (
        <Minus className="size-3.5" />
      ) : (
        checked && <Check className="size-3.5" />
      )}
    </span>
  )
}

/**
 * Derives a folder's checkbox state from its descendant bookmarks: `false`
 * when none are checked, `true` when all are, `'indeterminate'` otherwise.
 * Folders never store their own checked state (see {@link CheckedState}).
 * @param children The folder's direct children.
 * @param checkedState The current per-bookmark checked-id map.
 * @returns The derived checked state for the folder.
 */
function determineCheckedState(
  children: BookmarkNode[],
  checkedState: Map<string, boolean>,
): CheckedState {
  const bookmarkIds = collectBookmarkIds(children)
  if (bookmarkIds.length === 0) return false

  const checkedCount = bookmarkIds.filter((id) => checkedState.get(id)).length
  return (
    checkedCount !== 0 &&
    (checkedCount === bookmarkIds.length || 'indeterminate')
  )
}

function collectBookmarkIds(nodes: BookmarkNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.url) {
      ids.push(node.id)
    } else if (node.children) {
      ids.push(...collectBookmarkIds(node.children))
    }
  }
  return ids
}

function collectFolderIds(nodes: BookmarkNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.url || !node.children) continue
    ids.push(node.id, ...collectFolderIds(node.children))
  }
  return ids
}

function filterNodes(nodes: BookmarkNode[], term: string): BookmarkNode[] {
  const lower = term.toLowerCase()
  const result: BookmarkNode[] = []
  for (const node of nodes) {
    if (node.url) {
      if (isSearchMatch(node, lower)) result.push(node)
    } else {
      if (isSearchMatch(node, lower)) {
        result.push(node)
        continue
      }
      const matchedChildren = filterNodes(node.children ?? [], lower)
      if (matchedChildren.length > 0) {
        result.push({ ...node, children: matchedChildren })
      }
    }
  }
  return result
}

function isSearchMatch(node: BookmarkNode, lowerTerm: string): boolean {
  return (
    node.title.toLowerCase().includes(lowerTerm) ||
    (node.url?.toLowerCase().includes(lowerTerm) ?? false)
  )
}

function findAncestorsOfMatches(nodes: BookmarkNode[], term: string): string[] {
  const lower = term.toLowerCase()
  const ancestors: string[] = []

  function hasMatchingDescendant(nodes: BookmarkNode[]): boolean {
    let didMatch = false
    for (const node of nodes) {
      if (node.url) {
        if (isSearchMatch(node, lower)) didMatch = true
      } else {
        const didChildMatch = hasMatchingDescendant(node.children ?? [])
        if (didChildMatch || isSearchMatch(node, lower)) {
          ancestors.push(node.id)
          didMatch = true
        }
      }
    }
    return didMatch
  }

  hasMatchingDescendant(nodes)
  return ancestors
}

/**
 * Converts raw `browser.bookmarks` nodes into this component's
 * {@link BookmarkNode} shape, filling in each node's `parentId`
 * explicitly (the root's children are treated as top-level, i.e. their own
 * `parentId` is kept) so descendants don't depend on the live API object.
 * @param nodes The raw `browser.bookmarks` nodes to convert.
 * @param parentId The parent id to assign to top-level `nodes`.
 * @returns The converted nodes, with `parentId` filled in throughout.
 */
function addParentIds(
  nodes: Browser.bookmarks.BookmarkTreeNode[],
  parentId?: string,
): BookmarkNode[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    url: node.url,
    parentId: parentId ?? node.parentId,
    children: node.children ? addParentIds(node.children, node.id) : undefined,
  }))
}

function countChecked(
  nodes: BookmarkNode[],
  checkedState: Map<string, boolean>,
): number {
  return collectBookmarkIds(nodes).filter((id) => checkedState.get(id)).length
}

async function fetchFullTree(): Promise<Browser.bookmarks.BookmarkTreeNode[]> {
  return browser.bookmarks.getTree()
}

/**
 * Filters a raw bookmark tree down to checked bookmarks, keeping only the
 * folders needed to contain them — a folder with no checked descendants is
 * dropped entirely rather than kept empty.
 * @param tree The raw bookmark tree to prune.
 * @param checkedState The current per-bookmark checked-id map.
 * @returns The pruned tree, containing only checked bookmarks and their ancestors.
 */
function pruneTree(
  tree: Browser.bookmarks.BookmarkTreeNode[],
  checkedState: Map<string, boolean>,
): ExtendedBookmarkTreeNode[] {
  function prune(
    nodes: Browser.bookmarks.BookmarkTreeNode[],
  ): ExtendedBookmarkTreeNode[] {
    const result: ExtendedBookmarkTreeNode[] = []
    for (const node of nodes) {
      if (node.url) {
        if (checkedState.get(node.id)) {
          result.push(node as ExtendedBookmarkTreeNode)
        }
      } else if (node.children) {
        const prunedChildren = prune(node.children)
        if (prunedChildren.length > 0) {
          result.push({
            ...(node as ExtendedBookmarkTreeNode),
            children: prunedChildren,
          })
        }
      }
    }
    return result
  }

  return prune(tree[0]?.children ?? [])
}
