import { storage } from '#imports'

import type { AutoExportConfig } from '@/lib/types'

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

export const DEFAULT_AUTO_EXPORT_CONFIG: AutoExportConfig = {
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

export const autoExportLastRunStore = storage.defineItem<number | null>(
  'local:autoExportLastRun',
  { fallback: null },
)
