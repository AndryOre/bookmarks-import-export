import { i18n } from '#i18n'
import { CircleAlertIcon, CircleCheckIcon, Undo2Icon } from 'lucide-react'
import { useState } from 'react'
import type { SubmitEvent } from 'react'

import { ImportFileStep } from '@/components/import/import-file-step'
import { ImportModeStep } from '@/components/import/import-mode-step'
import { ImportPreviewStep } from '@/components/import/import-preview-step'
import { ImportReplaceDiffAlert } from '@/components/import/import-replace-diff-alert'
import { ImportStep } from '@/components/import/import-step'
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
import { getImportPreview } from '@/lib/import-preview'
import { getReplaceDiff } from '@/lib/replace-diff'
import type { ReplaceDiff } from '@/lib/replace-diff'
import { runImport } from '@/lib/run-import'
import {
  readLatestSafetySnapshot,
  restoreSafetySnapshot,
} from '@/lib/safety-snapshot'
import type { SafetySnapshot } from '@/lib/safety-snapshot'
import { defaultImportModeStore } from '@/lib/storage'
import type { ImportMode, ImportPreview } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

type ImportStatus =
  'idle' | 'importing' | 'success' | 'undoing' | 'undone' | 'error'

function openBookmarkManager() {
  void browser.tabs.create({ url: 'chrome://bookmarks' })
}

interface ChosenFile {
  file: File
  text: string
  preview: ImportPreview
  replaceDiff: ReplaceDiff | null
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
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState<SafetySnapshot | null>(null)

  const preview = chosen?.preview ?? null
  const isSupported = preview !== null && preview.format !== 'unknown'
  const hasLocationData = preview?.hasLocationData ?? false
  const effectiveMode: ImportMode = hasLocationData ? storedMode : 'folder'
  const isImporting = status === 'importing'
  const isEmpty = isSupported && preview.totalCount === 0

  const handleFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = getImportPreview(text, file.type, file.name)

      const replaceDiff =
        parsed.format !== 'unknown' && parsed.hasLocationData
          ? await getReplaceDiff(parsed)
          : null

      setChosen({ file, text, preview: parsed, replaceDiff })
      setStatus(parsed.format === 'unknown' ? 'error' : 'idle')
      setErrorMessage(
        parsed.format === 'unknown' ? i18n.t('unsupportedFileFormat') : '',
      )
    } catch (error) {
      setChosen(null)
      setStatus('error')
      setErrorMessage((error as Error).message)
    }
  }

  const executeImport = async () => {
    if (!chosen) return

    setStatus('importing')
    setErrorMessage('')
    setUndoSnapshot(null)

    try {
      await runImport(
        chosen.text,
        chosen.file.type,
        effectiveMode,
        chosen.file.name,
      )
      if (effectiveMode === 'restore-replace') {
        setUndoSnapshot(await readLatestSafetySnapshot())
      }
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage((error as Error).message)
    }
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
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
        <Alert>
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
        <Alert>
          <CircleCheckIcon />
          <AlertTitle>{i18n.t('bookmarksImportedSuccessfully')}</AlertTitle>
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
          disabled={isImporting}
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

          <Button type="submit" size="lg" disabled={isImporting || isEmpty}>
            {isImporting && <Spinner data-icon="inline-start" />}
            {isImporting
              ? i18n.t('import_importing')
              : i18n.t('import_submit', [preview.totalCount.toString()])}
          </Button>
          {isEmpty && (
            <p className="text-sm text-muted-foreground">
              {i18n.t('import_noBookmarks')}
            </p>
          )}
        </>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{i18n.t('import_errorTitle')}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
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
