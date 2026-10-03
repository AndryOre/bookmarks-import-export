import { i18n } from '#i18n'

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { formatCount } from '@/lib/format-count'

interface ImportSkipDuplicatesProperties {
  isChecked: boolean
  onCheckedChange: (isChecked: boolean) => void
  duplicateCount: number
  disabled: boolean
}

/**
 * The Skip duplicates switch of the import flow, with helper text stating how
 * many bookmarks in the file already exist (or repeat) and would be skipped.
 * @param root0 This component's properties.
 * @param root0.isChecked Whether Skip duplicates is on.
 * @param root0.onCheckedChange Called with the new switch state.
 * @param root0.duplicateCount How many bookmarks would be skipped.
 * @param root0.disabled Whether the switch is disabled (import in flight).
 * @returns The switch field.
 */
export function ImportSkipDuplicates({
  isChecked,
  onCheckedChange,
  duplicateCount,
  disabled,
}: ImportSkipDuplicatesProperties) {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="import-skip-duplicates">
          {i18n.t('import_skipDuplicates')}
        </FieldLabel>
        <FieldDescription>
          {duplicateCount > 0
            ? i18n.t('import_skipDuplicatesFound', duplicateCount, [
                formatCount(duplicateCount),
              ])
            : i18n.t('import_skipDuplicatesNone')}
        </FieldDescription>
      </FieldContent>
      <Switch
        id="import-skip-duplicates"
        checked={isChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </Field>
  )
}
