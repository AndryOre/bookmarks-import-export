import type { Browser } from '@wxt-dev/browser'
import type { ReactNode } from 'react'

import type { ExportFormat } from './export-formats'
import type { ImportControl } from './import-control'

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
  folderType?: string
  syncing?: boolean
}

/**
 * What an import reports back once it has finished writing bookmarks.
 * `skippedInvalidUrl` counts bookmarks that were left out because their
 * address is missing or not supported (anything outside http, https and ftp).
 * `skippedDuplicates` counts bookmarks left out by Skip duplicates.
 */
export interface ImportResult {
  skippedInvalidUrl: number
  skippedDuplicates: number
}

/**
 * Options shared by every importer. `skipDuplicates` leaves out bookmarks
 * whose normalized URL already exists in the browser or repeats earlier in the
 * file; it has no effect in Restore-replace. `trusted` is for trees read from
 * the browser itself (Safety snapshots): every URL is written, including
 * `javascript:`, `chrome://` and `file://`, and a failed create is counted
 * rather than fatal. Never set it for a file the user supplied.
 */
export interface ImportOptions extends ImportControl {
  skipDuplicates?: boolean
  trusted?: boolean
}

export type BookmarkFormat =
  'json' | 'html' | 'csv' | 'chrome' | 'xbel' | 'safari' | 'unknown'

export type ImportMode = 'folder' | 'restore-merge' | 'restore-replace'

export type AutoExportInterval = '1h' | '12h' | '1d' | '3d' | '7d'

/**
 * Day of the week as `Date#getDay` numbers it: 0 is Sunday, 6 is Saturday.
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface AutoExportConfig {
  enabled: boolean
  interval: AutoExportInterval
  /**
   * `HH:mm` in 24h format — only used for intervals >= 1d.
   */
  preferredTime: string
  /**
   * The day the weekly (`7d`) interval runs on — only used for `7d`.
   */
  dayOfWeek: DayOfWeek
  path: string
  formats: ExportFormat[]
  /**
   * Retention: how many of Snug's own exported files to keep in the folder.
   * `0` keeps everything. See `applyRetention` in `lib/auto-export-retention.ts`.
   */
  keepLast: number
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
  clearsMobileRoot: boolean
  /**
   * The root types (`folderType`) for which the file carries both a local
   * and an account set. Absent for a single-set file.
   */
  splitRootTypes?: ('bookmarks-bar' | 'other' | 'mobile')[]
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
  /**
   * Adds every currently visible bookmark to the selection.
   */
  selectAll: () => void
  /**
   * Clears the selection. While a search is active, only the visible
   * bookmarks are cleared so selections outside the search survive.
   */
  deselectAll: () => void
  /**
   * Whether every currently visible bookmark is selected.
   */
  areAllVisibleSelected: () => boolean
  expandAll: () => void
  collapseAll: () => void
  refresh: () => Promise<void>
  /**
   * Returns the selected bookmarks as an `ExtendedBookmarkTreeNode[]`, with
   * the minimal folder hierarchy needed to contain them (the tree is
   * pruned). Folders left empty by the pruning are not included.
   */
  getSelectedBookmarks: () => Promise<ExtendedBookmarkTreeNode[]>
}

export interface BookmarkTreeProperties {
  searchTerm: string
  onSelectionChange: (count: number) => void
  onTotalChange: (count: number) => void
  /**
   * Extra classes merged onto the tree's scroll container.
   */
  className?: string
  /**
   * Rendered instead of the tree until the first load completes.
   */
  loadingState?: ReactNode
  /**
   * Rendered instead of the tree when an active search matches nothing.
   */
  emptyState?: ReactNode
  /**
   * Rendered instead of the tree when the profile has no bookmarks at all.
   */
  noBookmarksState?: ReactNode
  /**
   * Rendered instead of the tree when loading the bookmarks failed; receives
   * a callback that retries the load.
   */
  errorState?: (retry: () => void) => ReactNode
}
