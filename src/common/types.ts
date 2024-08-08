import { type ClassValue } from "clsx"

/**
 * Represents a node in the bookmark tree structure.
 */
export interface BookmarkNode {
  /** Unique identifier for the bookmark node */
  id: string
  /** Title of the bookmark or folder */
  title: string
  /** URL of the bookmark (undefined for folders) */
  url?: string
  /** Child nodes (for folders) */
  children?: BookmarkNode[]
  /** ID of the parent node */
  parentId?: string
}

/**
 * Represents the checked state of a bookmark node.
 * Can be a boolean (true/false) or "indeterminate" for partially checked folders.
 */
export type CheckedState = boolean | "indeterminate"

/**
 * Extended version of Chrome's BookmarkTreeNode with additional properties.
 */
export interface ExtendedBookmarkTreeNode
  extends chrome.bookmarks.BookmarkTreeNode {
  /** Timestamp of when the folder's contents were last modified */
  dateGroupModified?: number
  /** Timestamp of when the bookmark was last used */
  dateLastUsed?: number
  /** Base64 encoded icon data */
  iconData?: string
  /** Child nodes (for folders) */
  children?: ExtendedBookmarkTreeNode[]
  /** Allow for additional properties */
  [key: string]: any
}

/**
 * Supported bookmark export formats.
 */
export type BookmarkFormat = "json" | "html" | "unknown"

/**
 * Interface for the imperative handle of the BookmarkTree component.
 */
export interface BookmarkTreeHandle {
  /** Selects all bookmarks */
  selectAll: () => void
  /** Deselects all bookmarks */
  deselectAll: () => void
  /** Refreshes the bookmark tree */
  refresh: () => void
  /** Retrieves all selected bookmarks */
  getSelectedBookmarks: () => Promise<ExtendedBookmarkTreeNode[]>
}

/**
 * Props for the SearchBar component.
 */
export interface SearchBarProps {
  /** Current search term */
  searchTerm: string
  /** Callback function to handle search term changes */
  onSearchChange: (term: string) => void
}

/**
 * Props for the SettingsDialog component.
 */
export interface SettingsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback function to close the dialog */
  onClose: () => void
}

/**
 * Props for the Header component.
 */
export interface HeaderProps {
  /** Current search term */
  searchTerm: string
  /** Callback function to handle search term changes */
  onSearchChange: (term: string) => void
  /** Callback function to refresh the bookmark tree */
  onRefresh: () => void
  /** Callback function to select all bookmarks */
  onSelectAll: () => void
  /** Callback function to deselect all bookmarks */
  onDeselectAll: () => void
  /** Number of currently selected bookmarks */
  selectedCount: number
  /** Total number of bookmarks */
  totalCount: number
  /** Callback function to export bookmarks */
  onExport: (format: "html" | "json") => void
}

/**
 * Props for the BookmarkTree component.
 */
export interface BookmarkTreeProps {
  /** Current search term */
  searchTerm: string
  /** Callback function to handle selection changes */
  onSelectionChange: (selectedCount: number, totalCount: number) => void
}

/**
 * Type definition for the cn function used for class name generation.
 */
export type CnFunction = (...inputs: ClassValue[]) => string

/**
 * Represents a parsed bookmark or folder from HTML or JSON import.
 */
export interface ParsedBookmark {
  /** Title of the bookmark or folder */
  title: string
  /** URL of the bookmark (undefined for folders) */
  url?: string
  /** Timestamp of when the bookmark or folder was added */
  dateAdded: number
  /** Timestamp of when the folder was last modified (for folders only) */
  dateGroupModified?: number
  /** Child bookmarks or folders (for folders only) */
  children?: ParsedBookmark[]
  /** Indicates if this is the Bookmarks Bar folder */
  isBookmarksBar?: boolean
  /** Indicates if this is the Other Bookmarks folder */
  isOtherBookmarks?: boolean
  /** Optional ID for the bookmark or folder (used in JSON import) */
  id?: string
}
