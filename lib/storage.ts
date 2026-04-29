import { storage } from '#imports';

export const themeStore = storage.defineItem<'dark' | 'light' | 'system'>(
  'local:theme',
  { fallback: 'system' }
);

export const showBookmarkIconStore = storage.defineItem<boolean>(
  'local:showBookmarkIcon',
  { fallback: true }
);

export const autoExpandFoldersStore = storage.defineItem<boolean>(
  'local:autoExpandFolders',
  { fallback: false }
);

export const includeIconDataStore = storage.defineItem<boolean>(
  'local:includeIconData',
  { fallback: true }
);

export const includeDateAddedStore = storage.defineItem<boolean>(
  'local:includeDateAdded',
  { fallback: true }
);

export const includeDateLastUsedStore = storage.defineItem<boolean>(
  'local:includeDateLastUsed',
  { fallback: false }
);

export const includeDateGroupModifiedStore = storage.defineItem<boolean>(
  'local:includeDateGroupModified',
  { fallback: true }
);

export const hideOtherBookmarksStore = storage.defineItem<boolean>(
  'local:hideOtherBookmarks',
  { fallback: true }
);

export const hideParentFolderStore = storage.defineItem<boolean>(
  'local:hideParentFolder',
  { fallback: false }
);

export const settingsStores = {
  showBookmarkIcon: showBookmarkIconStore,
  autoExpandFolders: autoExpandFoldersStore,
  includeIconData: includeIconDataStore,
  includeDateAdded: includeDateAddedStore,
  includeDateLastUsed: includeDateLastUsedStore,
  includeDateGroupModified: includeDateGroupModifiedStore,
  hideOtherBookmarks: hideOtherBookmarksStore,
  hideParentFolder: hideParentFolderStore,
} as const;

export type SettingKey = keyof typeof settingsStores;
