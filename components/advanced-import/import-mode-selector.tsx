import { TriangleAlert } from 'lucide-react';
import { i18n } from '#i18n';
import type { ImportMode } from '@/lib/types';

interface ImportModeSelectorProps {
  value: ImportMode;
  onChange: (mode: ImportMode) => void;
  hasLocationData: boolean;
}

interface ModeOption {
  value: ImportMode;
  label: string;
  description: string;
}

export function ImportModeSelector({ value, onChange, hasLocationData }: ImportModeSelectorProps) {
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
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{i18n.t('importMode')}</p>

      <div className="space-y-2">
        {options.map((option) => {
          const disabled = !hasLocationData && option.value !== 'folder';
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={[
                'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                selected
                  ? 'border-primary bg-primary/5'
                  : disabled
                    ? 'border-border opacity-40 cursor-not-allowed'
                    : 'border-border hover:border-muted-foreground cursor-pointer',
              ].join(' ')}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={[
                    'mt-0.5 size-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    selected ? 'border-primary' : 'border-muted-foreground',
                  ].join(' ')}
                >
                  {selected && <div className="size-2 rounded-full bg-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!hasLocationData && (
        <p className="text-xs text-muted-foreground">{i18n.t('importModeNotAvailableForCSV')}</p>
      )}

      {value === 'restore-replace' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
          <TriangleAlert className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{i18n.t('importModeRestoreReplaceWarning')}</p>
        </div>
      )}
    </div>
  );
}
