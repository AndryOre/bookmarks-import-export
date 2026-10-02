import { i18n } from '#i18n'
import { TriangleAlertIcon, UploadIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { getImportModeItems } from '@/lib/import-mode-items'
import { getImportPreview } from '@/lib/import-preview'
import { runImport } from '@/lib/run-import'
import { defaultImportModeStore } from '@/lib/storage'
import type { ImportMode } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

interface PendingImport {
  text: string
  mimeType: string
  mode: ImportMode
}

/**
 * Popup Import section: a labelled default-mode select, a destructive alert
 * while that mode is Restore - replace, and a "Choose file..." button that
 * imports the picked file. A file with no location data (CSV, or HTML/JSON
 * without root folders) is imported in `folder` mode for that file only.
 * Restore - replace asks for confirmation in an `AlertDialog` first. The
 * button shows a spinner and is disabled while importing; the outcome is
 * reported with a toast.
 * @returns The import section element.
 */
export function ImportSection() {
  const fileInputReference = useRef<HTMLInputElement>(null)
  const modeSelectId = useId()
  const [mode, setMode] = useStorageItem(defaultImportModeStore)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const performImport = async ({
    text,
    mimeType,
    mode: importMode,
  }: PendingImport) => {
    setIsImporting(true)
    try {
      await runImport(text, mimeType, importMode)
      toast.add({
        type: 'success',
        title: i18n.t('popup_importSuccessTitle'),
      })
    } catch (error) {
      toast.add({
        type: 'error',
        title: i18n.t('popup_importFailedTitle'),
        description: (error as Error).message,
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    let prepared: PendingImport
    try {
      const text = await file.text()
      const { format, totalCount, hasLocationData } = getImportPreview(
        text,
        file.type,
      )
      if (format === 'unknown') {
        throw new Error(i18n.t('unsupportedFileFormat'))
      }
      if (totalCount === 0) {
        throw new Error(i18n.t('import_noBookmarks'))
      }
      prepared = {
        text,
        mimeType: file.type,
        mode: hasLocationData ? mode : 'folder',
      }
    } catch (error) {
      toast.add({
        type: 'error',
        title: i18n.t('popup_importFailedTitle'),
        description: (error as Error).message,
      })
      return
    }

    if (prepared.mode === 'restore-replace') {
      setPendingImport(prepared)
      return
    }
    await performImport(prepared)
  }

  const handleConfirmReplace = () => {
    if (!pendingImport) return
    const confirmed = pendingImport
    setPendingImport(null)
    void performImport(confirmed)
  }

  return (
    <section className="flex flex-col gap-2">
      <input
        ref={fileInputReference}
        type="file"
        accept=".csv,.json,.html,.htm"
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

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingImport(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t('replaceConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.t('replaceConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18n.t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmReplace}
            >
              {i18n.t('replaceConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
