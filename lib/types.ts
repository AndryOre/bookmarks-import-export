import { i18n } from '#i18n'
import type { GeneratedI18nStructure } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

/**
 * A valid `i18n.t()` message key.
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
 * @param key The message key to translate.
 * @returns The translated string.
 */
export function t<K extends MessageKey>(key: K): string {
  const getMessage = i18n.t as (key: MessageKey) => string
  return getMessage(key)
}

/**
 * Minimal bookmark node shape, independent of the `browser.bookmarks` API.
 * Used where a plain, serializable tree is needed (e.g. as an intermediate
 * or exported representation) without depending on the extension-runtime
 * fields that {@link ExtendedBookmarkTreeNode} carries.
 */
export interface BookmarkNode {
  id: string
  title: string
  url?: string
  children?: BookmarkNode[]
  parentId?: string
}

/**
 * `browser.bookmarks.BookmarkTreeNode` as actually returned at runtime,
 * widened with the extra fields browsers attach that aren't part of the
 * WebExtension type declarations (`dateGroupModified`, `dateLastUsed`,
 * `iconData`) plus an index signature for any other vendor-specific field.
 * Kept distinct from {@link BookmarkNode}: this type is the live API
 * object, while `BookmarkNode` is this codebase's own normalized shape.
 */
export interface ExtendedBookmarkTreeNode
  extends Browser.bookmarks.BookmarkTreeNode {
  dateGroupModified?: number
  dateLastUsed?: number
  iconData?: string
  [key: string]: unknown
}

/**
 * Intermediate structure every importer produces internally. It does not
 * map 1:1 to `browser.bookmarks` nodes — it's the normalized shape each
 * format-specific parser (HTML, JSON, CSV) converts its input into, before
 * the app turns it into real bookmarks.
 */
export interface ParsedBookmark {
  title: string
  url?: string
  dateAdded: number
  dateGroupModified?: number
  children?: ParsedBookmark[]
  isBookmarksBar?: boolean
  isOtherBookmarks?: boolean
  isMobileBookmarks?: boolean
  id?: string
  parentId?: string
}

export type BookmarkFormat = 'json' | 'html' | 'csv' | 'unknown'

export type ImportMode = 'folder' | 'restore-merge' | 'restore-replace'

export type AutoExportInterval = '12h' | '1d' | '3d' | '7d'
export type AutoExportFormat = 'html' | 'json' | 'csv'

export interface AutoExportConfig {
  enabled: boolean
  interval: AutoExportInterval
  /**
   * `HH:mm` in 24h format — only used for intervals >= 1d.
   */
  preferredTime: string
  path: string
  formats: AutoExportFormat[]
}

/**
 * What caused a {@link AutoExportLastRun} to happen: `scheduled` for an
 * on-time alarm fire, `catch-up` for a run fired shortly after startup
 * because the stored next-run time had already passed, and `manual` for a
 * user-triggered "Export now" (a later ticket's UI, but the type is defined
 * here since `runAutoExport` already discriminates on it).
 */
export type AutoExportTrigger = 'scheduled' | 'catch-up' | 'manual'

/**
 * The outcome of the most recent {@link runAutoExport} call, persisted so
 * settings/popup UI (a later ticket) can show status. A legacy plain
 * `number` (this store's shape before next-run tracking was added) is
 * migrated on read to `{ at: <value>, ok: true, trigger: 'scheduled' }` —
 * see `readAutoExportLastRun` in `lib/auto-export.ts`.
 */
export interface AutoExportLastRun {
  at: number
  ok: boolean
  error?: string
  trigger: AutoExportTrigger
}

export interface ImportPreview {
  format: BookmarkFormat
  bookmarksBarCount: number
  otherBookmarksCount: number
  mobileBookmarksCount: number
  totalCount: number
  hasLocationData: boolean
}

/**
 * The checked state of a node in the selection tree.
 * - `true`: every descendant bookmark is selected.
 * - `false`: no descendant is selected.
 * - `"indeterminate"`: some, but not all, descendants are selected.
 *
 * Folders never store this state — it's derived at render time via
 * `determineCheckedState()`. Only bookmarks (nodes with a `url`) have a
 * stored state, kept in a `Map<id, boolean>`.
 */
export type CheckedState = boolean | 'indeterminate'

export interface BookmarkTreeHandle {
  selectAll: () => void
  deselectAll: () => void
  refresh: () => Promise<void>
  /**
   * Returns the selected bookmarks as an `ExtendedBookmarkTreeNode[]`, with
   * the minimal folder hierarchy needed to contain them (the tree is
   * pruned). Folders left empty by the pruning are not included.
   */
  getSelectedBookmarks: () => Promise<ExtendedBookmarkTreeNode[]>
}

export interface SearchBarProperties {
  value: string
  onChange: (value: string) => void
}

/**
 * The three tabs {@link SettingsDialog} renders.
 */
export type SettingsTab = 'display' | 'export' | 'auto-export'

export interface SettingsDialogProperties {
  /**
   * Matches Radix/shadcn Dialog's controlled `open`/`onOpenChange` prop
   * convention — renaming it would fight that API at every call site.
   */
  open: boolean
  onOpenChange: (isOpen: boolean) => void
  /**
   * Which tab is active when the dialog renders. Defaults to `'display'`
   * when omitted — callers only pass this to force a specific tab, such as
   * the `advanced-export.html?settings=auto-export` deep link opening
   * straight onto the Auto-export tab.
   */
  defaultTab?: SettingsTab
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
