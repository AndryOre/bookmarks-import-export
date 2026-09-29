import { i18n } from '#i18n'
import type { GeneratedI18nStructure } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

// ──────────────────────────────────────────
// i18n
// ──────────────────────────────────────────

/**
A valid `i18n.t()` message key.
*/
export type MessageKey = keyof GeneratedI18nStructure

/**
 * Type-safe wrapper for a dynamic `i18n.t()` call (e.g. a message key
 * chosen from a component prop or a lookup table). `i18n.t` is generic and
 * overloaded per message's plural/substitution shape, so passing it an
 * already-widened `MessageKey` union does not type-check — none of the
 * overloads' filtered-by-shape parameter types accept a plain union that
 * isn't a "naked" generic parameter from `i18n.t`'s own perspective. Every
 * generated message this app has is non-plural, and this helper is only
 * for the ones with no substitutions, so the narrower internal signature
 * below is exactly the plain-string overload's real runtime behavior.
 */
export function t<K extends MessageKey>(key: K): string {
  const getMessage = i18n.t as (key: MessageKey) => string
  return getMessage(key)
}

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
  [key: string]: unknown
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

export interface SearchBarProperties {
  value: string
  onChange: (value: string) => void
}

export interface SettingsDialogProperties {
  // Matches Radix/shadcn Dialog's controlled `open`/`onOpenChange` prop
  // convention — renaming it would fight that API at every call site.
  open: boolean
  onOpenChange: (isOpen: boolean) => void
}

export interface HeaderProperties {
  selectedCount: number
  totalCount: number
  searchTerm: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onExport: (format: BookmarkFormat) => void
}

export interface BookmarkTreeProperties {
  searchTerm: string
  onSelectionChange: (count: number) => void
  onTotalChange: (count: number) => void
}
