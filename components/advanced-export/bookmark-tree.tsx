import type { Browser } from '@wxt-dev/browser'
import { File, Folder } from 'lucide-react'
import {
  forwardRef,
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
  BookmarkTreeProps,
  CheckedState,
  ExtendedBookmarkTreeNode,
} from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

export const BookmarkTree = forwardRef<BookmarkTreeHandle, BookmarkTreeProps>(
  function BookmarkTree({ searchTerm, onSelectionChange, onTotalChange }, ref) {
    const [nodes, setNodes] = useState<BookmarkNode[]>([])
    const [checkedState, setCheckedState] = useState<Map<string, boolean>>(
      new Map(),
    )
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(),
    )
    const preSearchExpandedRef = useRef<Set<string> | null>(null)

    const [showBookmarkIcon] = useStorageItem(showBookmarkIconStore)
    const [autoExpandFolders] = useStorageItem(autoExpandFoldersStore)

    useImperativeHandle(ref, () => ({
      selectAll: () => {
        const allBookmarkIds = collectBookmarkIds(nodes)
        const newState = new Map<string, boolean>()
        allBookmarkIds.forEach((id) => newState.set(id, true))
        setCheckedState(newState)
      },
      deselectAll: () => {
        setCheckedState(new Map())
      },
      refresh: async () => {
        await loadBookmarks()
        setCheckedState(new Map())
      },
      getSelectedBookmarks: async () => {
        const tree = await fetchFullTree()
        return pruneTree(tree, checkedState)
      },
    }))

    useEffect(() => {
      loadBookmarks()
    }, [autoExpandFolders])

    useEffect(() => {
      if (!searchTerm.trim()) {
        if (preSearchExpandedRef.current !== null) {
          setExpandedFolders(preSearchExpandedRef.current)
          preSearchExpandedRef.current = null
        }
        return
      }
      if (preSearchExpandedRef.current === null) {
        preSearchExpandedRef.current = new Set(expandedFolders)
      }
      const matchedAncestors = findAncestorsOfMatches(nodes, searchTerm)
      setExpandedFolders(new Set(matchedAncestors))
    }, [searchTerm, nodes])

    useEffect(() => {
      const total = collectBookmarkIds(nodes).length
      onTotalChange(total)
    }, [nodes])

    useEffect(() => {
      const count = countChecked(nodes, checkedState)
      onSelectionChange(count)
    }, [checkedState, nodes])

    async function loadBookmarks() {
      const tree = await fetchFullTree()
      const rootNode = tree[0]
      const withParentId = addParentIds(rootNode?.children ?? [])
      setNodes(withParentId)

      if (autoExpandFolders) {
        const allFolderIds = collectFolderIds(withParentId)
        setExpandedFolders(new Set(allFolderIds))
      }
    }

    function handleToggleExpand(id: string) {
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    function handleCheckedChange(node: BookmarkNode, value: CheckedState) {
      const newValue = value === 'indeterminate' ? false : value

      setCheckedState((prev) => {
        const next = new Map(prev)
        if (node.url) {
          next.set(node.id, newValue)
        } else {
          const descendants = collectBookmarkIds(node.children ?? [])
          descendants.forEach((id) => next.set(id, newValue))
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
  },
)

// ── Componentes de render ─────────────────────────────────────────────────────

interface NodeListProps {
  nodes: BookmarkNode[]
  level: number
  checkedState: Map<string, boolean>
  expandedFolders: Set<string>
  showBookmarkIcon: boolean
  searchTerm: string
  onToggleExpand: (id: string) => void
  onCheckedChange: (node: BookmarkNode, value: CheckedState) => void
}

function NodeList(props: NodeListProps) {
  return (
    <>
      {props.nodes.map((node) => (
        <NodeRow key={node.id} node={node} {...props} />
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
}: NodeListProps & { node: BookmarkNode }) {
  const isExpanded = expandedFolders.has(node.id)
  const checked = node.url
    ? (checkedState.get(node.id) ?? false)
    : determineCheckedState(node.children ?? [], checkedState)

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-1.5 rounded py-0.5 hover:bg-accent"
        style={{ marginLeft: level * 16 }}
        onClick={() => {
          if (!node.url) onToggleExpand(node.id)
        }}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) =>
            onCheckedChange(node, value as CheckedState)
          }
          onClick={(e) => e.stopPropagation()}
          aria-label={node.title}
        />

        {node.url ? (
          showBookmarkIcon ? (
            <img
              src={getFaviconUrl(node.url)}
              alt=""
              className="size-4 shrink-0"
              aria-hidden="true"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <File
              className="size-4 shrink-0 text-blue-500"
              aria-hidden="true"
            />
          )
        ) : (
          <Folder
            className="size-4 shrink-0 text-yellow-500"
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function determineCheckedState(
  children: BookmarkNode[],
  checkedState: Map<string, boolean>,
): CheckedState {
  const bookmarkIds = collectBookmarkIds(children)
  if (bookmarkIds.length === 0) return false

  const checkedCount = bookmarkIds.filter((id) => checkedState.get(id)).length
  if (checkedCount === 0) return false
  if (checkedCount === bookmarkIds.length) return true
  return 'indeterminate'
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
    if (!node.url && node.children) {
      ids.push(node.id)
      ids.push(...collectFolderIds(node.children))
    }
  }
  return ids
}

function filterNodes(nodes: BookmarkNode[], term: string): BookmarkNode[] {
  const lower = term.toLowerCase()
  return nodes.reduce<BookmarkNode[]>((acc, node) => {
    if (node.url) {
      if (nodeMatchesSearch(node, lower)) acc.push(node)
    } else {
      const matchedChildren = filterNodes(node.children ?? [], lower)
      if (matchedChildren.length > 0 || nodeMatchesSearch(node, lower)) {
        acc.push({ ...node, children: matchedChildren })
      }
    }
    return acc
  }, [])
}

function nodeMatchesSearch(node: BookmarkNode, lowerTerm: string): boolean {
  return (
    node.title.toLowerCase().includes(lowerTerm) ||
    (node.url?.toLowerCase().includes(lowerTerm) ?? false)
  )
}

function findAncestorsOfMatches(nodes: BookmarkNode[], term: string): string[] {
  const lower = term.toLowerCase()
  const ancestors: string[] = []

  function traverse(nodes: BookmarkNode[]): boolean {
    let hasMatch = false
    for (const node of nodes) {
      if (node.url) {
        if (nodeMatchesSearch(node, lower)) hasMatch = true
      } else {
        const childHasMatch = traverse(node.children ?? [])
        if (childHasMatch) {
          ancestors.push(node.id)
          hasMatch = true
        }
      }
    }
    return hasMatch
  }

  traverse(nodes)
  return ancestors
}

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
