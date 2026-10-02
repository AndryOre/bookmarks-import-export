import { i18n } from '#i18n'
import { TriangleAlertIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCount } from '@/lib/format-count'
import type { ReplaceDiff } from '@/lib/replace-diff'

/**
 * Destructive alert for the Import preview of a Restore-replace: how many
 * bookmarks the replace removes and adds, and that a Safety snapshot makes it
 * undoable.
 * @param root0 This component's properties.
 * @param root0.diff The removed and added counts for the chosen file.
 * @returns The destructive replace summary.
 */
export function ImportReplaceDiffAlert({ diff }: { diff: ReplaceDiff }) {
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>
        {i18n.t('import_replaceDiffTitle', diff.removedCount, [
          formatCount(diff.removedCount),
          formatCount(diff.addedCount),
        ])}
      </AlertTitle>
      <AlertDescription>
        {i18n.t('import_replaceDiffDescription')}
      </AlertDescription>
    </Alert>
  )
}
