import { ChevronDown, ChevronRight, File, Folder } from "lucide-react"
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState
} from "react"

import { getFaviconUrl } from "~common/lib"
import type {
  BookmarkNode,
  BookmarkTreeHandle,
  BookmarkTreeProps,
  CheckedState,
  ExtendedBookmarkTreeNode
} from "~common/types"
import { Checkbox } from "~components"

/**
 * BookmarkTreeComponent is a complex component that renders a tree structure of bookmarks.
 * It allows for expanding/collapsing folders, searching, and selecting bookmarks.
 *
 * @component
 * @param {Object} props - The component props
 * @param {string} props.searchTerm - The current search term to filter bookmarks
 * @param {function} props.onSelectionChange - Callback function triggered when the selection changes
 * @param {React.Ref<BookmarkTreeHandle>} ref - Ref object for imperative handle
 * @returns {JSX.Element} The rendered BookmarkTree component
 */
const BookmarkTreeComponent = forwardRef<BookmarkTreeHandle, BookmarkTreeProps>(
  ({ searchTerm, onSelectionChange }, ref) => {
    const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([])
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set()
    )
    const [checkedState, setCheckedState] = useState<
      Record<string, CheckedState>
    >({})
    const [autoExpand, setAutoExpand] = useState<boolean>(false)
    const [showBookmarkIcon, setShowBookmarkIcon] = useState<boolean>(true)

    /**
     * Collects all folder IDs from the bookmark tree
     */
    const allFolderIds = useMemo(() => {
      const ids = new Set<string>()
      const collectFolderIds = (nodes: BookmarkNode[]) => {
        nodes.forEach((node) => {
          if (!node.url) {
            ids.add(node.id)
            if (node.children) {
              collectFolderIds(node.children)
            }
          }
        })
      }
      collectFolderIds(bookmarks)
      return ids
    }, [bookmarks])

    /**
     * Expands all folders in the bookmark tree
     */
    const expandAllFolders = useCallback(() => {
      setExpandedFolders(new Set(allFolderIds))
    }, [allFolderIds])

    /**
     * Fetches bookmarks from the Chrome API and processes them
     */
    const fetchBookmarks = useCallback(() => {
      chrome.bookmarks.getTree((result) => {
        const processNode = (
          node: chrome.bookmarks.BookmarkTreeNode,
          parentId?: string
        ): BookmarkNode => ({
          ...node,
          parentId,
          children: node.children?.map((child) => processNode(child, node.id))
        })
        const processed =
          result[0].children?.map((node) => processNode(node)) || []
        setBookmarks(processed)

        const countBookmarks = (nodes: BookmarkNode[]): number => {
          return nodes.reduce((count, node) => {
            if (node.url) {
              return count + 1
            }
            return count + (node.children ? countBookmarks(node.children) : 0)
          }, 0)
        }
        const totalBookmarks = countBookmarks(processed)
        onSelectionChange(0, totalBookmarks)
      })
    }, [onSelectionChange])

    /**
     * Loads the auto-expand setting from localStorage
     */
    useEffect(() => {
      const autoExpandSetting = localStorage.getItem("autoExpandFolders")
      setAutoExpand(autoExpandSetting === "true")
    }, [])

    /**
     * Fetches bookmarks on component mount
     */
    useEffect(() => {
      fetchBookmarks()
    }, [fetchBookmarks])

    /**
     * Expands all folders if auto-expand is enabled
     */
    useEffect(() => {
      if (autoExpand) {
        expandAllFolders()
      }
    }, [autoExpand, expandAllFolders])

    /**
     * Handles changes in settings
     */
    useEffect(() => {
      const handleSettingsChange = () => {
        const autoExpandSetting = localStorage.getItem("autoExpandFolders")
        const showBookmarkIconSetting = localStorage.getItem("showBookmarkIcon")
        setAutoExpand(autoExpandSetting === "true")
        setShowBookmarkIcon(showBookmarkIconSetting === "true")
      }

      window.addEventListener("settingsChanged", handleSettingsChange)
      handleSettingsChange() // Initialize settings
      return () => {
        window.removeEventListener("settingsChanged", handleSettingsChange)
      }
    }, [])

    /**
     * Updates the selection count when bookmarks or checked state changes
     */
    useEffect(() => {
      const countBookmarksAndSelected = (
        nodes: BookmarkNode[]
      ): [number, number] => {
        return nodes.reduce(
          ([totalCount, selectedCount], node) => {
            if (node.url) {
              return [
                totalCount + 1,
                selectedCount + (checkedState[node.id] ? 1 : 0)
              ]
            }
            if (node.children) {
              const [childTotal, childSelected] = countBookmarksAndSelected(
                node.children
              )
              return [totalCount + childTotal, selectedCount + childSelected]
            }
            return [totalCount, selectedCount]
          },
          [0, 0]
        )
      }

      const [totalBookmarks, selectedBookmarks] =
        countBookmarksAndSelected(bookmarks)
      onSelectionChange(selectedBookmarks, totalBookmarks)
    }, [bookmarks, checkedState, onSelectionChange])

    /**
     * Checks if a node matches the current search term
     * @param {BookmarkNode} node - The node to check
     * @returns {boolean} True if the node matches the search term, false otherwise
     */
    const nodeMatchesSearch = useCallback(
      (node: BookmarkNode): boolean => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
          node.title.toLowerCase().includes(term) ||
          (node.url && node.url.toLowerCase().includes(term))
        )
      },
      [searchTerm]
    )

    /**
     * Finds a parent node by its ID
     * @param {string | undefined} parentId - The ID of the parent node to find
     * @returns {BookmarkNode | undefined} The found parent node or undefined
     */
    const findParentNode = useCallback(
      (parentId?: string): BookmarkNode | undefined => {
        if (!parentId) return undefined
        for (const bookmark of bookmarks) {
          const found = findNodeById(bookmark, parentId)
          if (found) return found
        }
        return undefined
      },
      [bookmarks]
    )

    /**
     * Expands folders based on search term
     */
    useEffect(() => {
      if (!searchTerm) {
        return
      }

      const foldersToExpand = new Set<string>()

      const checkNode = (node: BookmarkNode): boolean => {
        let matchFound = nodeMatchesSearch(node)

        if (node.children) {
          const childrenMatch = node.children.some(checkNode)
          if (childrenMatch) {
            matchFound = true
          }
        }

        if (matchFound) {
          let current: BookmarkNode | undefined = node
          while (current) {
            foldersToExpand.add(current.id)
            current = findParentNode(current.parentId)
          }
        }

        return matchFound
      }

      bookmarks.forEach(checkNode)
      setExpandedFolders(foldersToExpand)
    }, [searchTerm, bookmarks, nodeMatchesSearch, findParentNode])

    /**
     * Toggles the expanded state of a folder
     * @param {string} id - The ID of the folder to toggle
     */
    const toggleFolder = useCallback((id: string) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }, [])

    /**
     * Finds a node by its ID in the bookmark tree
     * @param {BookmarkNode} node - The current node to check
     * @param {string} id - The ID of the node to find
     * @returns {BookmarkNode | undefined} The found node or undefined
     */
    const findNodeById = useCallback(
      (node: BookmarkNode, id: string): BookmarkNode | undefined => {
        if (node.id === id) return node
        if (node.children) {
          for (const child of node.children) {
            const found = findNodeById(child, id)
            if (found) return found
          }
        }
        return undefined
      },
      []
    )

    /**
     * Updates the checked state of a node and its children
     * @param {BookmarkNode} node - The node to update
     * @param {CheckedState} newState - The new checked state
     */
    const updateCheckedState = useCallback(
      (node: BookmarkNode, newState: CheckedState) => {
        setCheckedState((prev) => {
          const next = { ...prev }
          const updateNode = (n: BookmarkNode) => {
            if (n.url) {
              next[n.id] = newState
            }
            n.children?.forEach(updateNode)
          }
          updateNode(node)
          return next
        })
      },
      []
    )

    /**
     * Determines the checked state of a node based on its children
     * @param {BookmarkNode} node - The node to check
     * @returns {CheckedState} The determined checked state
     */
    const determineCheckedState = useCallback(
      (node: BookmarkNode): CheckedState => {
        if (node.url) {
          return checkedState[node.id] || false
        }
        if (node.children && node.children.length > 0) {
          const childStates = node.children.map(determineCheckedState)
          if (childStates.every((state) => state === true)) return true
          if (childStates.every((state) => state === false)) return false
          return "indeterminate"
        }
        return false
      },
      [checkedState]
    )

    /**
     * Handles the change in checked state for a node
     * @param {CheckedState} checked - The new checked state
     * @param {BookmarkNode} node - The node being checked/unchecked
     */
    const handleCheckedChange = useCallback(
      (checked: CheckedState, node: BookmarkNode) => {
        updateCheckedState(node, checked === "indeterminate" ? false : checked)
      },
      [updateCheckedState]
    )

    /**
     * Renders a single bookmark node
     * @param {BookmarkNode} node - The bookmark node to render
     * @param {number} level - The indentation level of the node
     * @returns {JSX.Element | null} The rendered node or null if it doesn't match the search
     */
    const renderBookmarkNode = useCallback(
      (node: BookmarkNode, level: number = 0): JSX.Element | null => {
        const isFolder = !node.url
        const isExpanded = expandedFolders.has(node.id)
        const checkState = determineCheckedState(node)

        const nodeMatches = nodeMatchesSearch(node)
        const childrenMatch =
          isFolder &&
          node.children?.some(
            (child) => renderBookmarkNode(child, level + 1) !== null
          )

        if (!nodeMatches && !childrenMatch && searchTerm) return null

        return (
          <div key={node.id} className={`plasmo-ml-${level * 4}`}>
            <div className="plasmo-flex plasmo-items-center plasmo-py-2 plasmo-rounded">
              <Checkbox
                id={node.id}
                className="plasmo-mr-1"
                checked={checkState}
                onCheckedChange={(checked) =>
                  handleCheckedChange(checked, node)
                }
              />
              <div className="plasmo-flex plasmo-items-center plasmo-w-full">
                {isFolder && (
                  <button
                    onClick={() => toggleFolder(node.id)}
                    className="plasmo-mr-0.5">
                    {isExpanded ? (
                      <ChevronDown className="plasmo-h-4 plasmo-w-4 plasmo-text-muted-foreground" />
                    ) : (
                      <ChevronRight className="plasmo-h-4 plasmo-w-4 plasmo-text-muted-foreground" />
                    )}
                  </button>
                )}
                {isFolder ? (
                  <Folder
                    className="plasmo-h-4 plasmo-w-4 plasmo-mr-1 plasmo-text-yellow-500"
                    fill="currentColor"
                  />
                ) : showBookmarkIcon && node.url ? (
                  <img
                    src={getFaviconUrl(node.url)}
                    alt="Favicon"
                    className="plasmo-h-4 plasmo-w-4 plasmo-mr-1"
                  />
                ) : (
                  <File className="plasmo-h-4 plasmo-w-4 plasmo-mr-1 plasmo-text-blue-500" />
                )}
                <label
                  htmlFor={node.id}
                  className="plasmo-text-sm plasmo-truncate plasmo-cursor-pointer">
                  {node.title}
                </label>
              </div>
            </div>
            {isFolder && isExpanded && node.children && (
              <div className="plasmo-ml-6">
                {node.children.map((child) =>
                  renderBookmarkNode(child, level + 1)
                )}
              </div>
            )}
          </div>
        )
      },
      [
        expandedFolders,
        determineCheckedState,
        nodeMatchesSearch,
        searchTerm,
        handleCheckedChange,
        toggleFolder,
        showBookmarkIcon
      ]
    )

    /**
     * Selects all bookmarks in the tree
     */
    const handleSelectAll = useCallback(() => {
      const newState: Record<string, CheckedState> = {}
      const selectAllNodes = (node: BookmarkNode) => {
        if (node.url) {
          newState[node.id] = true
        }
        node.children?.forEach(selectAllNodes)
      }
      bookmarks.forEach(selectAllNodes)
      setCheckedState(newState)
    }, [bookmarks])

    /**
     * Deselects all bookmarks in the tree
     */
    const handleDeselectAll = useCallback(() => {
      setCheckedState({})
    }, [])

    /**
     * Retrieves all selected bookmarks
     * @returns {Promise<ExtendedBookmarkTreeNode[]>} A promise that resolves to an array of selected bookmarks
     */
    const getSelectedBookmarks = useCallback(async (): Promise<
      ExtendedBookmarkTreeNode[]
    > => {
      const selectedBookmarks: ExtendedBookmarkTreeNode[] = []

      const traverseNodes = (
        nodes: ExtendedBookmarkTreeNode[]
      ): ExtendedBookmarkTreeNode[] => {
        return nodes.reduce((acc: ExtendedBookmarkTreeNode[], node) => {
          if (checkedState[node.id]) {
            const selectedNode: ExtendedBookmarkTreeNode = { ...node }
            if (node.children) {
              selectedNode.children = traverseNodes(node.children)
            }
            acc.push(selectedNode)
          } else if (node.children) {
            const selectedChildren = traverseNodes(node.children)
            if (selectedChildren.length > 0) {
              acc.push({ ...node, children: selectedChildren })
            }
          }
          return acc
        }, [])
      }

      const rootNodes = bookmarks.filter(
        (node) => node.id === "1" || node.id === "2"
      )
      selectedBookmarks.push(...traverseNodes(rootNodes))

      return selectedBookmarks
    }, [bookmarks, checkedState])

    // Expose imperative handle for parent components to interact with the tree
    useImperativeHandle(
      ref,
      () => ({
        selectAll: handleSelectAll,
        deselectAll: handleDeselectAll,
        refresh: fetchBookmarks,
        getSelectedBookmarks
      }),
      [handleSelectAll, handleDeselectAll, fetchBookmarks, getSelectedBookmarks]
    )

    return (
      <div className="plasmo-h-full plasmo-overflow-auto plasmo-border plasmo-rounded-lg plasmo-shadow-sm plasmo-p-4">
        {bookmarks.map((node) => renderBookmarkNode(node))}
      </div>
    )
  }
)

BookmarkTreeComponent.displayName = "BookmarkTree"

export const BookmarkTree = BookmarkTreeComponent
