import type { Browser } from '@wxt-dev/browser'
import { File, Folder } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { getFaviconUrl } from '@/lib/favicon'
import { autoExpandFoldersStore, showBookmarkIconStore } from '@/lib/storage'
import type {
  BookmarkNode,
  BookmarkTreeHandle,
  BookmarkTreeProperties,
  CheckedState,
  ExtendedBookmarkTreeNode,
} from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

/**
 * Renders the checkbox tree of bookmarks used by the advanced export flow.
 * Exposes an imperative handle (see {@link BookmarkTreeHandle}) so the
 * parent can drive selection and refreshes without lifting the
 * checked-state map into props.
 */
export const BookmarkTree = forwardRef<
  BookmarkTreeHandle,
  BookmarkTreeProperties
>(function BookmarkTree(
  { searchTerm, onSelectionChange, onTotalChange },
  reference,
) {
  const [nodes, setNodes] = useState<BookmarkNode[]>([])
  /**
   * Checked state for leaf (bookmark) nodes only, keyed by bookmark id.
   * Folder checked/indeterminate state is never stored here — it's derived
   * from descendant bookmarks at render time by `determineCheckedState`.
   */
  const [checkedState, setCheckedState] = useState<Map<string, boolean>>(
    new Map(),
  )
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  /**
   * Snapshot of `expandedFolders` from just before a search started, so it
   * can be restored once the search term is cleared. `null` means no
   * search-driven expansion is currently in effect.
   */
  const preSearchExpandedReference = useRef<Set<string> | null>(null)

  const [showBookmarkIcon] = useStorageItem(showBookmarkIconStore)
  const [autoExpandFolders] = useStorageItem(autoExpandFoldersStore)

  const loadBookmarks = useCallback(async () => {
    const tree = await fetchFullTree()
    const rootNode = tree[0]
    const withParentId = addParentIds(rootNode?.children ?? [])
    setNodes(withParentId)

    if (!autoExpandFolders) return

    const allFolderIds = collectFolderIds(withParentId)
    setExpandedFolders(new Set(allFolderIds))
  }, [autoExpandFolders])

  /**
   * The imperative API exposed to the parent via `ref` (see
   * {@link BookmarkTreeHandle}). Selection lives in this component's own
   * state, so the parent needs a way to trigger selection changes and
   * refreshes without owning the checked-state map itself.
   */
  useImperativeHandle(reference, () => ({
    selectAll: () => {
      const allBookmarkIds = collectBookmarkIds(nodes)
      const newState = new Map<string, boolean>()
      for (const id of allBookmarkIds) newState.set(id, true)
      setCheckedState(newState)
    },
    deselectAll: () => {
      setCheckedState(new Map())
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

  function handleToggleExpand(id: string) {
    setExpandedFolders((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCheckedChange(node: BookmarkNode, value: CheckedState) {
    const isChecked = value !== 'indeterminate' && value

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

  const visibleNodes = searchTerm.trim()
    ? filterNodes(nodes, searchTerm)
    : nodes

  return (
    <div className="flex-1 overflow-auto p-2">
      <NodeList
        nodes={visibleNodes}
        level={0}
        checkedState={checkedState}
        expandedFolders={expandedFolders}
        showBookmarkIcon={showBookmarkIcon}
        searchTerm={searchTerm}
        onToggleExpand={handleToggleExpand}
        onCheckedChange={handleCheckedChange}
      />
    </div>
  )
})

interface NodeListProperties {
  nodes: BookmarkNode[]
  level: number
  checkedState: Map<string, boolean>
  expandedFolders: Set<string>
  showBookmarkIcon: boolean
  searchTerm: string
  onToggleExpand: (id: string) => void
  onCheckedChange: (node: BookmarkNode, value: CheckedState) => void
}

function NodeList(properties: NodeListProperties) {
  return (
    <>
      {properties.nodes.map((node) => (
        <NodeRow key={node.id} node={node} {...properties} />
      ))}
    </>
  )
}

function NodeRow({
  node,
  level,
  checkedState,
  expandedFolders,
  showBookmarkIcon,
  searchTerm,
  onToggleExpand,
  onCheckedChange,
}: NodeListProperties & { node: BookmarkNode }) {
  const isExpanded = expandedFolders.has(node.id)
  const checked = node.url
    ? (checkedState.get(node.id) ?? false)
    : determineCheckedState(node.children ?? [], checkedState)
  const isFolder = !node.url

  return (
    <div>
      <div
        className="ml-(--tree-indent) flex items-center gap-1.5 rounded py-0.5 hover:bg-accent data-[folder=true]:cursor-pointer"
        style={{ '--tree-indent': `${level * 16}px` } as React.CSSProperties}
        data-folder={isFolder}
        role={isFolder ? 'button' : undefined}
        tabIndex={isFolder ? 0 : undefined}
        onClick={() => {
          if (isFolder) onToggleExpand(node.id)
        }}
        onKeyDown={(event) => {
          if (!isFolder) return
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onToggleExpand(node.id)
        }}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) =>
            onCheckedChange(node, value as CheckedState)
          }
          onClick={(event) => event.stopPropagation()}
          aria-label={node.title}
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

        <span className="truncate text-sm">{node.title}</span>
      </div>

      {!node.url && isExpanded && node.children && (
        <NodeList
          nodes={node.children}
          level={level + 1}
          checkedState={checkedState}
          expandedFolders={expandedFolders}
          showBookmarkIcon={showBookmarkIcon}
          searchTerm={searchTerm}
          onToggleExpand={onToggleExpand}
          onCheckedChange={onCheckedChange}
        />
      )}
    </div>
  )
}

/**
 * Derives a folder's checkbox state from its descendant bookmarks: `false`
 * when none are checked, `true` when all are, `'indeterminate'` otherwise.
 * Folders never store their own checked state (see {@link CheckedState}).
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
      const matchedChildren = filterNodes(node.children ?? [], lower)
      if (matchedChildren.length > 0 || isSearchMatch(node, lower)) {
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
        if (didChildMatch) {
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
