import { i18n } from '#i18n'
import { TriangleAlert } from 'lucide-react'

import type { ImportMode } from '@/lib/types'

interface ImportModeSelectorProperties {
  value: ImportMode
  onChange: (mode: ImportMode) => void
  /**
   * True when the parsed file identifies a Bookmarks Bar or Other Bookmarks
   * root (possible for `html`/`json`, never for `csv`). When `false`, the
   * restore modes are disabled since there is nothing to merge or replace
   * bookmark locations against.
   */
  hasLocationData: boolean
}

interface ModeOption {
  value: ImportMode
  label: string
  description: string
}

/**
 * Lets the user pick how a parsed bookmarks file is imported: added under a
 * new folder (`folder`), merged into the existing tree by location
 * (`restore-merge`), or used to fully replace the existing tree
 * (`restore-replace`). The two restore modes are disabled whenever
 * `hasLocationData` is `false`, since they depend on location data the
 * source file doesn't provide.
 */
export function ImportModeSelector({
  value,
  onChange,
  hasLocationData,
}: ImportModeSelectorProperties) {
  const options: ModeOption[] = [
    {
      value: 'folder',
      label: i18n.t('importModeFolder'),
      description: i18n.t('importModeFolderDescription'),
    },
    {
      value: 'restore-merge',
      label: i18n.t('importModeRestoreMerge'),
      description: i18n.t('importModeRestoreMergeDescription'),
    },
    {
      value: 'restore-replace',
      label: i18n.t('importModeRestoreReplace'),
      description: i18n.t('importModeRestoreReplaceDescription'),
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{i18n.t('importMode')}</p>

      <div className="space-y-2">
        {options.map((option) => {
          const isDisabled = !hasLocationData && option.value !== 'folder'
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              onClick={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              className={[
                'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : isDisabled
                    ? 'cursor-not-allowed border-border opacity-40'
                    : 'cursor-pointer border-border hover:border-muted-foreground',
              ].join(' ')}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={[
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-primary' : 'border-muted-foreground',
                  ].join(' ')}
                >
                  {isSelected && (
                    <div className="size-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm leading-none font-medium">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {!hasLocationData && (
        <p className="text-xs text-muted-foreground">
          {i18n.t('importModeNotAvailableForCSV')}
        </p>
      )}

      {value === 'restore-replace' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            {i18n.t('importModeRestoreReplaceWarning')}
          </p>
        </div>
      )}
    </div>
  )
}
