import { i18n } from '#i18n'

import type { ImportMode } from '@/lib/types'

/**
 * The import modes as `{ value, label }` pairs for a Base UI `Select`'s
 * `items` prop, so the closed trigger shows the localized label rather than
 * the raw mode value.
 * @returns One localized item per import mode.
 */
export function getImportModeItems(): { value: ImportMode; label: string }[] {
  return [
    { value: 'folder', label: i18n.t('importModeFolder') },
    { value: 'restore-merge', label: i18n.t('importModeRestoreMerge') },
    { value: 'restore-replace', label: i18n.t('importModeRestoreReplace') },
  ]
}
