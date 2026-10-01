import { i18n } from '#i18n'
import type { WxtStorageItem } from '#imports'
import { useState } from 'react'

import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { formatFilenameTemplate } from '@/lib/filename-template'
import {
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  includeDateAddedStore,
  includeDateGroupModifiedStore,
  includeDateLastUsedStore,
  includeIconDataStore,
} from '@/lib/storage'
import { useStorageItem } from '@/lib/use-storage-item'

interface OptionSwitchProperties {
  id: string
  label: string
  store: WxtStorageItem<boolean, Record<string, unknown>>
}

/**
 * One switch row bound to a boolean storage item; every toggle is saved
 * immediately and read back from storage on mount.
 * @param properties The row props.
 * @param properties.id The DOM id linking the label to the switch.
 * @param properties.label The visible row label.
 * @param properties.store The boolean storage item the switch reads and writes.
 * @returns The labelled switch row.
 */
function OptionSwitch({ id, label, store }: OptionSwitchProperties) {
  const [checked, setChecked] = useStorageItem(store)
  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(value) => void setChecked(value)}
      />
    </Field>
  )
}

/**
 * The Export options column: filename template with live preview, then the
 * date/icon switches and the hide switches. Self-contained and storage-backed,
 * so it takes no props and the host only decides where to place it.
 * @returns The panel markup.
 */
export function ExportOptionsPanel() {
  const [storedTemplate, setStoredTemplate] = useStorageItem(
    exportFilenameTemplateStore,
  )
  const [draftTemplate, setDraftTemplate] = useState(storedTemplate)
  const [syncedTemplate, setSyncedTemplate] = useState(storedTemplate)

  if (storedTemplate !== syncedTemplate) {
    setSyncedTemplate(storedTemplate)
    setDraftTemplate(storedTemplate)
  }

  const handleTemplateChange = (value: string) => {
    setDraftTemplate(value)
    void setStoredTemplate(value)
  }

  return (
    <section
      aria-labelledby="export-options-title"
      className="flex w-72 flex-col gap-4"
    >
      <h2
        id="export-options-title"
        className="text-xs font-medium text-muted-foreground"
      >
        {i18n.t('exportOptions_title')}
      </h2>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="export-options-filename">
            {i18n.t('exportFilenameTemplate')}
          </FieldLabel>
          <Input
            id="export-options-filename"
            value={draftTemplate}
            onChange={(event) => handleTemplateChange(event.target.value)}
          />
          <p
            data-testid="export-options-preview"
            className="text-xs text-muted-foreground"
          >
            {i18n.t('exportFilenameTemplatePreview')}{' '}
            <span className="font-mono">
              {formatFilenameTemplate(draftTemplate)}
            </span>
          </p>
        </Field>
        <Separator />
        <OptionSwitch
          id="export-options-icons"
          label={i18n.t('exportOptions_includeIcons')}
          store={includeIconDataStore}
        />
        <OptionSwitch
          id="export-options-date-added"
          label={i18n.t('exportOptions_dateAdded')}
          store={includeDateAddedStore}
        />
        <OptionSwitch
          id="export-options-date-last-used"
          label={i18n.t('exportOptions_dateLastUsed')}
          store={includeDateLastUsedStore}
        />
        <OptionSwitch
          id="export-options-folder-dates"
          label={i18n.t('exportOptions_folderDates')}
          store={includeDateGroupModifiedStore}
        />
        <Separator />
        <OptionSwitch
          id="export-options-hide-other"
          label={i18n.t('exportOptions_hideOther')}
          store={hideOtherBookmarksStore}
        />
        <OptionSwitch
          id="export-options-hide-parent"
          label={i18n.t('exportOptions_hideParent')}
          store={hideParentFolderStore}
        />
      </FieldGroup>
    </section>
  )
}
