import type { Browser } from '@wxt-dev/browser'

// ──────────────────────────────────────────
// Bookmark Node types
// ──────────────────────────────────────────

export interface BookmarkNode {
  id: string
  title: string
  url?: string
  children?: BookmarkNode[]
  parentId?: string
}

export interface ExtendedBookmarkTreeNode
  extends Browser.bookmarks.BookmarkTreeNode {
  dateGroupModified?: number
  dateLastUsed?: number
  iconData?: string
  [key: string]: any
}

/**
 * Estructura intermedia que todos los importadores producen internamente.
 * No corresponde 1:1 a nodos de Chrome — es la forma normalizada post-parseo.
 */
export interface ParsedBookmark {
  title: string
  url?: string
  dateAdded: number
  dateGroupModified?: number
  children?: ParsedBookmark[]
  isBookmarksBar?: boolean
  isOtherBookmarks?: boolean
  id?: string
  parentId?: string
}

// ──────────────────────────────────────────
// Export options
// ──────────────────────────────────────────

export interface DateOptions {
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  includeDateGroupModified: boolean
}

export type BookmarkFormat = 'json' | 'html' | 'csv' | 'unknown'

export type ImportMode = 'folder' | 'restore-merge' | 'restore-replace'

export type AutoExportInterval = '12h' | '1d' | '3d' | '7d'
export type AutoExportFormat = 'html' | 'json' | 'csv'

export interface AutoExportConfig {
  enabled: boolean
  interval: AutoExportInterval
  preferredTime: string // HH:mm in 24h format — only used for intervals >= 1d
  path: string
  formats: AutoExportFormat[]
}

export interface ImportPreview {
  format: BookmarkFormat
  bookmarksBarCount: number
  otherBookmarksCount: number
  totalCount: number
  hasLocationData: boolean
}

// ──────────────────────────────────────────
// UI — Checkbox state
// ──────────────────────────────────────────

/**
 * Estado de un checkbox en el árbol de selección.
 * - true: todos los bookmarks descendientes están seleccionados
 * - false: ninguno seleccionado
 * - "indeterminate": algunos descendientes seleccionados
 *
 * IMPORTANTE: las carpetas nunca guardan este estado — se DERIVA en render
 * vía determineCheckedState(). Solo los bookmarks (nodos con url) tienen
 * estado guardado en el Map<id, boolean>.
 */
export type CheckedState = boolean | 'indeterminate'

// ──────────────────────────────────────────
// BookmarkTree handle (imperative API)
// ──────────────────────────────────────────

export interface BookmarkTreeHandle {
  selectAll: () => void
  deselectAll: () => void
  refresh: () => Promise<void>
  /**
   * Retorna un array de ExtendedBookmarkTreeNode[] que representa
   * solo los bookmarks seleccionados, con la jerarquía de carpetas
   * mínima para contenerlos (poda del árbol).
   * Carpetas vacías tras la poda no se incluyen.
   */
  getSelectedBookmarks: () => Promise<ExtendedBookmarkTreeNode[]>
}

// ──────────────────────────────────────────
// Component Props
// ──────────────────────────────────────────

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface HeaderProps {
  selectedCount: number
  totalCount: number
  searchTerm: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onExport: (format: BookmarkFormat) => void
}

export interface BookmarkTreeProps {
  searchTerm: string
  onSelectionChange: (count: number) => void
  onTotalChange: (count: number) => void
}
