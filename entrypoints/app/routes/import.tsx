import { i18n } from '#i18n'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  Undo2Icon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { SubmitEvent } from 'react'

import { ImportFileStep } from '@/components/import/import-file-step'
import { ImportModeStep } from '@/components/import/import-mode-step'
import { ImportPreviewStep } from '@/components/import/import-preview-step'
import { ImportReplaceDiffAlert } from '@/components/import/import-replace-diff-alert'
import { ImportSkipDuplicates } from '@/components/import/import-skip-duplicates'
import { ImportStep } from '@/components/import/import-step'
import { OperationProgressCard } from '@/components/operation-progress-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatCount } from '@/lib/format-count'
import { ImportCanceledError, wasImportRestored } from '@/lib/import-control'
import { summarizeImportDuplicates } from '@/lib/import-duplicates'
import type { ImportDuplicateSummary } from '@/lib/import-duplicates'
import { getImportPreview } from '@/lib/import-preview'
import { loadLiveRootTitles } from '@/lib/importers/resolve-roots'
import { createLatestOnly } from '@/lib/latest-only'
import { getReplaceDiff } from '@/lib/replace-diff'
import type { ReplaceDiff } from '@/lib/replace-diff'
import { runImport } from '@/lib/run-import'
import { restoreSafetySnapshot } from '@/lib/safety-snapshot'
import type { SafetySnapshot } from '@/lib/safety-snapshot'
import { defaultImportModeStore, skipDuplicatesStore } from '@/lib/storage'
import type { ImportMode, ImportPreview } from '@/lib/types'
import { useOperationProgress } from '@/lib/use-operation-progress'
import { useStorageItem } from '@/lib/use-storage-item'

type ImportStatus =
  'idle' | 'importing' | 'canceled' | 'success' | 'undoing' | 'undone' | 'error'

/**
 * Ref callback that moves focus to an element when it mounts, so a result
 * view keeps keyboard focus after the form that triggered it unmounts.
 * @param element The mounted element, or `null` on unmount.
 */
function focusOnMount(element: HTMLElement | null) {
  element?.focus()
}

function openBookmarkManager() {
  void browser.tabs.create({ url: 'chrome://bookmarks' })
}

interface ChosenFile {
  file: File
  text: string
  preview: ImportPreview
  replaceDiff: ReplaceDiff | null
  duplicates: ImportDuplicateSummary
}

async function analyzeFile(file: File) {
  const text = await file.text()
  const parsed = getImportPreview(
    text,
    file.type,
    file.name,
    await loadLiveRootTitles(),
  )
  const replaceDiff =
    parsed.format !== 'unknown' && parsed.hasLocationData
      ? await getReplaceDiff(parsed)
      : null
  const duplicates =
    parsed.format === 'unknown'
      ? { skippedDuplicates: 0, importableCount: 0 }
      : await summarizeImportDuplicates(text, file.type, file.name)
  return { text, parsed, replaceDiff, duplicates }
}

/**
 * The Import screen: a stepped flow of file, preview, import mode and a
 * primary action. The mode initialises from, and writes back to,
 * {@link defaultImportModeStore} (shared with the popup's quick import); a
 * file without location data is forced to Folder mode for that file only,
 * leaving the stored default untouched. "Restore - replace" is destructive,
 * so it asks for confirmation before anything is written.
 * @returns The rendered stepped import flow.
 */
export function ImportRoute() {
  const [chosen, setChosen] = useState<ChosenFile | null>(null)
  const [storedMode, setStoredMode] = useStorageItem(defaultImportModeStore)
  const [skipDuplicates, setSkipDuplicates] =
    useStorageItem(skipDuplicatesStore)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [wasRestored, setWasRestored] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState<SafetySnapshot | null>(null)
  const [skippedCount, setSkippedCount] = useState(0)
  const [skippedDuplicatesCount, setSkippedDuplicatesCount] = useState(0)
  const progress = useOperationProgress()

  const preview = chosen?.preview ?? null
  const isSupported = preview !== null && preview.format !== 'unknown'
  const hasLocationData = preview?.hasLocationData ?? false
  const effectiveMode: ImportMode = hasLocationData ? storedMode : 'folder'
  const isImporting = status === 'importing'
  const isBusy = isImporting || isAnalyzing
  const isEmpty = isSupported && preview.totalCount === 0
  const isSkippingDuplicates =
    skipDuplicates && effectiveMode !== 'restore-replace'
  const importCount =
    isSkippingDuplicates && chosen
      ? chosen.duplicates.importableCount
      : (preview?.totalCount ?? 0)

  const analyzeLatestFile = useRef(createLatestOnly(analyzeFile)).current

  const importStartedReference = useRef(false)

  const handleFile = async (file: File) => {
    if (importStartedReference.current) return
    setIsAnalyzing(true)
    try {
      const outcome = await analyzeLatestFile(file)
      if (!outcome.isCurrent || importStartedReference.current) return
      const { parsed, text, replaceDiff, duplicates } = outcome.value
      setChosen({ file, text, preview: parsed, replaceDiff, duplicates })
      setStatus(parsed.format === 'unknown' ? 'error' : 'idle')
      setErrorMessage(
        parsed.format === 'unknown' ? i18n.t('unsupportedFileFormat') : '',
      )
    } catch (error) {
      setChosen(null)
      setStatus('error')
      setErrorMessage((error as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const executeImport = async () => {
    if (!chosen || isAnalyzing) return

    importStartedReference.current = true
    setStatus('importing')
    setErrorMessage('')
    setUndoSnapshot(null)
    setSkippedCount(0)
    setSkippedDuplicatesCount(0)
    const signal = progress.begin()

    try {
      const result = await runImport(
        chosen.text,
        chosen.file.type,
        effectiveMode,
        chosen.file.name,
        {
          skipDuplicates: isSkippingDuplicates,
          signal,
          onProgress: progress.report,
        },
      )
      setUndoSnapshot(result.snapshot ?? null)
      setSkippedCount(result.skippedInvalidUrl)
      setSkippedDuplicatesCount(result.skippedDuplicates)
      setStatus('success')
    } catch (error) {
      if (error instanceof ImportCanceledError) {
        setStatus('canceled')
      } else {
        setStatus('error')
        setErrorMessage((error as Error).message)
        setWasRestored(wasImportRestored(error))
      }
    } finally {
      importStartedReference.current = false
      progress.end()
    }
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isBusy) return
    if (effectiveMode === 'restore-replace') {
      setIsConfirmOpen(true)
    } else {
      void executeImport()
    }
  }

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    void executeImport()
  }

  const handleUndo = async () => {
    if (!undoSnapshot) return

    setStatus('undoing')
    setErrorMessage('')

    try {
      await restoreSafetySnapshot(undoSnapshot)
      setUndoSnapshot(null)
      setStatus('undone')
    } catch (error) {
      setStatus('success')
      setErrorMessage((error as Error).message)
    }
  }

  const handleReset = () => {
    setUndoSnapshot(null)
    setChosen(null)
    setStatus('idle')
    setErrorMessage('')
  }

  if (status === 'undone') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Alert key="undone" tabIndex={-1} ref={focusOnMount}>
          <Undo2Icon />
          <AlertTitle>{i18n.t('import_undoneTitle')}</AlertTitle>
          <AlertDescription>
            {i18n.t('import_undoneDescription')}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReset}>
            {i18n.t('import_another')}
          </Button>
          <Button variant="ghost" onClick={openBookmarkManager}>
            {i18n.t('import_openManager')}
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'success' || status === 'undoing') {
    const isUndoing = status === 'undoing'
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Alert key="success" tabIndex={-1} ref={focusOnMount}>
          <CircleCheckIcon />
          <AlertTitle>{i18n.t('bookmarksImportedSuccessfully')}</AlertTitle>
          {skippedDuplicatesCount > 0 && (
            <AlertDescription>
              {i18n.t('import_skippedDuplicates', skippedDuplicatesCount, [
                formatCount(skippedDuplicatesCount),
              ])}
            </AlertDescription>
          )}
          {skippedCount > 0 && (
            <AlertDescription>
              {i18n.t('import_skippedInvalidUrl', skippedCount, [
                formatCount(skippedCount),
              ])}
            </AlertDescription>
          )}
        </Alert>
        {errorMessage && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{i18n.t('import_undoFailedTitle')}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {undoSnapshot && (
            <Button
              variant="destructive"
              disabled={isUndoing}
              onClick={() => void handleUndo()}
            >
              {isUndoing && <Spinner data-icon="inline-start" />}
              {isUndoing ? i18n.t('import_undoing') : i18n.t('import_undo')}
            </Button>
          )}
          <Button variant="outline" onClick={handleReset}>
            {i18n.t('import_another')}
          </Button>
          <Button variant="ghost" onClick={openBookmarkManager}>
            {i18n.t('import_openManager')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >
      <ImportStep
        number={1}
        title={i18n.t('import_stepFile')}
        isComplete={isSupported}
      >
        <ImportFileStep
          file={chosen?.file ?? null}
          onFile={(file) => void handleFile(file)}
          disabled={isBusy}
        />
      </ImportStep>

      {isSupported && preview && (
        <>
          <ImportStep number={2} title={i18n.t('importPreview')} isComplete>
            <div className="flex flex-col gap-3">
              <ImportPreviewStep preview={preview} />
              {effectiveMode === 'restore-replace' && chosen?.replaceDiff && (
                <ImportReplaceDiffAlert diff={chosen.replaceDiff} />
              )}
            </div>
          </ImportStep>

          <ImportStep
            number={3}
            title={i18n.t('importMode')}
            isComplete={false}
          >
            <ImportModeStep
              value={effectiveMode}
              onChange={(mode) => void setStoredMode(mode)}
              hasLocationData={hasLocationData}
              disabled={isImporting}
            />
          </ImportStep>

          {effectiveMode !== 'restore-replace' && (
            <ImportSkipDuplicates
              isChecked={skipDuplicates}
              onCheckedChange={(checked) => void setSkipDuplicates(checked)}
              duplicateCount={chosen?.duplicates.skippedDuplicates ?? 0}
              disabled={isImporting}
            />
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isBusy || isEmpty || importCount === 0}
          >
            {isImporting && <Spinner data-icon="inline-start" />}
            {isImporting
              ? i18n.t('import_importing')
              : i18n.t('import_submit', importCount, [
                  formatCount(importCount),
                ])}
          </Button>
          {progress.state.isCardVisible && (
            <OperationProgressCard
              kind="import"
              state={progress.state}
              onCancel={progress.requestCancel}
            />
          )}
          {isEmpty && (
            <p className="text-sm text-muted-foreground">
              {i18n.t('import_noBookmarks')}
            </p>
          )}
        </>
      )}

      {status === 'canceled' && (
        <Alert tabIndex={-1} ref={focusOnMount}>
          <CircleSlashIcon />
          <AlertTitle>{i18n.t('progress_importCanceledTitle')}</AlertTitle>
          <AlertDescription>
            {i18n.t('progress_importCanceledDescription')}
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive" tabIndex={-1} ref={focusOnMount}>
          <CircleAlertIcon />
          <AlertTitle>{i18n.t('import_errorTitle')}</AlertTitle>
          <AlertDescription>
            {errorMessage}
            {wasRestored && ` ${i18n.t('import_errorRestored')}`}
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t('import_replaceTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.t('replaceConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18n.t('cancel')}</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirm}>
              {i18n.t('import_replaceConfirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
