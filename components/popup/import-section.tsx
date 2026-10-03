import { i18n } from '#i18n'
import { TriangleAlertIcon, UploadIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { OperationProgressCard } from '@/components/operation-progress-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { APP_ROUTES, getAppUrl } from '@/lib/app-url'
import { formatCount } from '@/lib/format-count'
import { ImportCanceledError } from '@/lib/import-control'
import { getImportModeItems } from '@/lib/import-mode-items'
import { planPopupImport } from '@/lib/popup-import-plan'
import { runImport } from '@/lib/run-import'
import { defaultImportModeStore, skipDuplicatesStore } from '@/lib/storage'
import type { ImportMode } from '@/lib/types'
import { useOperationProgress } from '@/lib/use-operation-progress'
import { useStorageItem } from '@/lib/use-storage-item'

interface PendingImport {
  text: string
  mimeType: string
  fileName: string
  mode: ImportMode
}

/**
 * Popup Import section: a labelled default-mode select, a destructive alert
 * while that mode is Restore - replace, and a "Choose file..." button that
 * imports the picked file. A file with no location data (CSV, or HTML/JSON
 * without root folders) is imported in `folder` mode for that file only.
 * Restore - replace, and any import above `POPUP_IMPORT_BOOKMARK_LIMIT`
 * bookmarks, never run in the popup, because Chrome closes it on focus loss
 * mid-import; they open the App Import page instead. The button shows a
 * spinner and is disabled from the moment a file is picked until the import
 * ends; the outcome is reported with a toast.
 * @returns The import section element.
 */
export function ImportSection() {
  const fileInputReference = useRef<HTMLInputElement>(null)
  const modeSelectId = useId()
  const [mode, setMode] = useStorageItem(defaultImportModeStore)
  const isBusyReference = useRef(false)
  const [isImporting, setIsImporting] = useState(false)
  const progress = useOperationProgress()

  const performImport = async ({
    text,
    mimeType,
    fileName,
    mode: importMode,
  }: PendingImport) => {
    const signal = progress.begin()
    try {
      const result = await runImport(text, mimeType, importMode, fileName, {
        skipDuplicates: await skipDuplicatesStore.getValue(),
        signal,
        onProgress: progress.report,
      })
      const notes = [
        result.skippedDuplicates > 0
          ? i18n.t('import_skippedDuplicates', result.skippedDuplicates, [
              formatCount(result.skippedDuplicates),
            ])
          : '',
        result.skippedInvalidUrl > 0
          ? i18n.t('import_skippedInvalidUrl', result.skippedInvalidUrl, [
              formatCount(result.skippedInvalidUrl),
            ])
          : '',
      ].filter(Boolean)
      toast.add({
        type: 'success',
        title: i18n.t('popup_importSuccessTitle'),
        description: notes.length > 0 ? notes.join('. ') : undefined,
      })
    } catch (error) {
      toast.add(
        error instanceof ImportCanceledError
          ? {
              title: i18n.t('progress_importCanceledTitle'),
              description: i18n.t('progress_importCanceledDescription'),
            }
          : {
              type: 'error',
              title: i18n.t('popup_importFailedTitle'),
              description: (error as Error).message,
            },
      )
    } finally {
      progress.end()
    }
  }

  const prepareImport = async (file: File): Promise<PendingImport | null> => {
    const text = await file.text()
    const plan = await planPopupImport({
      text,
      mimeType: file.type,
      fileName: file.name,
      mode,
      skipDuplicates: await skipDuplicatesStore.getValue(),
    })
    if (plan.kind === 'app') {
      void browser.tabs.create({ url: getAppUrl(APP_ROUTES.import) })
      return null
    }
    if (plan.kind === 'all-duplicates') {
      toast.add({
        title: i18n.t('import_nothingToImportTitle'),
        description: i18n.t('import_allDuplicates'),
      })
      return null
    }
    return { text, mimeType: file.type, fileName: file.name, mode: plan.mode }
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || isBusyReference.current) return
    isBusyReference.current = true
    setIsImporting(true)
    try {
      let prepared: PendingImport | null
      try {
        prepared = await prepareImport(file)
      } catch (error) {
        toast.add({
          type: 'error',
          title: i18n.t('popup_importFailedTitle'),
          description: (error as Error).message,
        })
        return
      }
      if (prepared) await performImport(prepared)
    } finally {
      isBusyReference.current = false
      setIsImporting(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <input
        ref={fileInputReference}
        type="file"
        accept=".csv,.json,.html,.htm,.xbel,.xml"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <Field>
        <FieldLabel htmlFor={modeSelectId}>
          {i18n.t('defaultImportMode')}
        </FieldLabel>
        <Select
          items={getImportModeItems()}
          value={mode}
          onValueChange={(value) => void setMode(value as ImportMode)}
        >
          <SelectTrigger id={modeSelectId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="folder">
                {i18n.t('importModeFolder')}
              </SelectItem>
              <SelectItem value="restore-merge">
                {i18n.t('importModeRestoreMerge')}
              </SelectItem>
              <SelectItem value="restore-replace">
                {i18n.t('importModeRestoreReplace')}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {mode === 'restore-replace' && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{i18n.t('popup_replaceAlertTitle')}</AlertTitle>
          <AlertDescription>
            {i18n.t('importModeRestoreReplaceWarning')}
          </AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        className="w-full"
        disabled={isImporting}
        onClick={() => fileInputReference.current?.click()}
      >
        {isImporting ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <UploadIcon data-icon="inline-start" />
        )}
        {isImporting ? i18n.t('popup_importing') : i18n.t('popup_chooseFile')}
      </Button>

      {progress.state.isCardVisible && (
        <OperationProgressCard
          kind="import"
          state={progress.state}
          onCancel={progress.requestCancel}
        />
      )}
    </section>
  )
}
