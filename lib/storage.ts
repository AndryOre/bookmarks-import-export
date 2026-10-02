import { storage } from '#imports'

import type {
  AutoExportConfig,
  AutoExportLastRun,
  ImportMode,
} from '@/lib/types'

/**
 * All persisted extension settings, defined with `storage.defineItem` so
 * every store lives under a `local:` key (per-browser-profile storage, not
 * synced). `entrypoints/background.ts` watches {@link autoExportConfigStore}
 * specifically, so any change to auto-export settings re-syncs the
 * `auto-export` alarm without waiting for the next `onStartup`.
 */
export const themeStore = storage.defineItem<'dark' | 'light' | 'system'>(
  'local:theme',
  { fallback: 'system' },
)

export const showBookmarkIconStore = storage.defineItem<boolean>(
  'local:showBookmarkIcon',
  { fallback: true },
)

export const autoExpandFoldersStore = storage.defineItem<boolean>(
  'local:autoExpandFolders',
  { fallback: false },
)

export const includeIconDataStore = storage.defineItem<boolean>(
  'local:includeIconData',
  { fallback: true },
)

export const includeDateAddedStore = storage.defineItem<boolean>(
  'local:includeDateAdded',
  { fallback: true },
)

export const includeDateLastUsedStore = storage.defineItem<boolean>(
  'local:includeDateLastUsed',
  { fallback: false },
)

export const includeDateGroupModifiedStore = storage.defineItem<boolean>(
  'local:includeDateGroupModified',
  { fallback: true },
)

export const hideOtherBookmarksStore = storage.defineItem<boolean>(
  'local:hideOtherBookmarks',
  { fallback: true },
)

export const hideParentFolderStore = storage.defineItem<boolean>(
  'local:hideParentFolder',
  { fallback: false },
)

export const exportFilenameTemplateStore = storage.defineItem<string>(
  'local:exportFilenameTemplate',
  { fallback: 'Bookmarks_%yyyy-%mm-%dd_%hh-%min-%sec' },
)

/**
 * The format last chosen in the popup's Export section, so a one-click
 * "Export all" repeats it next time.
 */
export const lastExportFormatStore = storage.defineItem<
  'csv' | 'html' | 'json'
>('local:lastExportFormat', { fallback: 'html' })

const DEFAULT_AUTO_EXPORT_CONFIG: AutoExportConfig = {
  enabled: false,
  interval: '1d',
  preferredTime: '00:00',
  path: 'bookmarks-backup/',
  formats: ['html'],
}

export const autoExportConfigStore = storage.defineItem<AutoExportConfig>(
  'local:autoExportConfig',
  { fallback: DEFAULT_AUTO_EXPORT_CONFIG },
)

export const autoExportLastRunStore = storage.defineItem<
  AutoExportLastRun | number | null
>('local:autoExportLastRun', { fallback: null })

/**
 * The authoritative next due time for auto-export, in epoch milliseconds.
 * `null` means auto-export is disabled (or has zero formats selected) — see
 * `syncAlarm` in `lib/auto-export.ts`, which is the only writer besides
 * `runAutoExport` re-arming after a scheduled/catch-up run.
 */
export const autoExportNextRunStore = storage.defineItem<number | null>(
  'local:autoExportNextRun',
  { fallback: null },
)

/**
 * The last extension version whose changelog the user has seen in the App.
 * `null` until the What's new screen is first visited; the sidebar shows an
 * unseen dot while this differs from the installed version.
 */
export const lastSeenVersionStore = storage.defineItem<string | null>(
  'local:lastSeenVersion',
  { fallback: null },
)

export const defaultImportModeStore = storage.defineItem<ImportMode>(
  'local:defaultImportMode',
  { fallback: 'restore-merge' },
)
