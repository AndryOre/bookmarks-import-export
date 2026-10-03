import { i18n } from '#i18n'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { formatCount } from '@/lib/format-count'
import type { OperationProgressState } from '@/lib/use-operation-progress'

type OperationKind = 'import' | 'export'

interface OperationProgressCardProperties {
  kind: OperationKind
  state: OperationProgressState
  onCancel: () => void
}

function countLine(
  kind: OperationKind,
  { done, total, skippedDuplicates }: OperationProgressState,
): string {
  const counts: [string, string] = [formatCount(done), formatCount(total)]
  const base =
    kind === 'import'
      ? i18n.t('progress_importCount', counts)
      : i18n.t('progress_exportCount', counts)
  if (kind !== 'import' || skippedDuplicates === 0) return base
  const skipped = i18n.t('import_skippedDuplicates', skippedDuplicates, [
    formatCount(skippedDuplicates),
  ])
  return `${base} · ${skipped}`
}

/**
 * Card shown while a long import or export runs: a progress bar with the
 * running counts and a Cancel button. While canceling it switches to
 * "Canceling…" with the button disabled until the browser is back to its
 * previous state. The description is a polite live region, so count and state
 * changes are announced.
 * @param properties The card props.
 * @param properties.kind Whether an import or an export is running.
 * @param properties.state Counts and phase driving the bar.
 * @param properties.onCancel Called when the Cancel button is pressed.
 * @returns The progress card element.
 */
export function OperationProgressCard({
  kind,
  state,
  onCancel,
}: OperationProgressCardProperties) {
  const isCanceling = state.phase === 'canceling'
  const title = isCanceling
    ? i18n.t('progress_cancelingTitle')
    : kind === 'import'
      ? i18n.t('progress_importTitle')
      : i18n.t('progress_exportTitle')
  const description = isCanceling
    ? kind === 'import'
      ? i18n.t('progress_cancelingImportDescription')
      : i18n.t('progress_cancelingExportDescription')
    : countLine(kind, state)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription role="status" aria-live="polite">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress
          value={state.done}
          max={Math.max(state.total, 1)}
          aria-label={title}
        />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isCanceling}
          aria-label={
            kind === 'import'
              ? i18n.t('progress_cancelImport')
              : i18n.t('progress_cancelExport')
          }
          onClick={onCancel}
        >
          {isCanceling && <Spinner data-icon="inline-start" />}
          {i18n.t('cancel')}
        </Button>
      </CardFooter>
    </Card>
  )
}
