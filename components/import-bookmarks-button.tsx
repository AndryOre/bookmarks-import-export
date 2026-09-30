import { i18n } from '#i18n'
import { TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { detectFormat } from '@/lib/detect-format'
import { getImportPreview } from '@/lib/import-preview'
import { importFromCSV } from '@/lib/importers/import-csv'
import { importFromHTML } from '@/lib/importers/import-html'
import { importFromJSON } from '@/lib/importers/import-json'
import { defaultImportModeStore } from '@/lib/storage'
import type { ImportMode } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

interface PendingImport {
  format: 'csv' | 'html' | 'json'
  text: string
  mode: ImportMode
}

async function runImport(
  format: 'csv' | 'html' | 'json',
  text: string,
  mode: ImportMode,
): Promise<void> {
  switch (format) {
    case 'csv': {
      await importFromCSV(text)
      break
    }
    case 'json': {
      await importFromJSON(JSON.parse(text), mode)
      break
    }
    case 'html': {
      await importFromHTML(text, mode)
      break
    }
  }
}

/**
 * Quick-import entry point: picks a bookmarks file and imports it using the
 * persisted {@link defaultImportModeStore} default mode, which this
 * component also lets the user change (shared with the Advanced Import
 * flow's `ImportModeSelector`). A parsed file with no location data — a
 * CSV, or an HTML/JSON file with no Bookmarks Bar/Other Bookmarks data — is
 * silently imported in `folder` mode instead, for that file only, leaving
 * the stored default untouched. When the stored default is
 * `restore-replace`, importing first opens a confirmation dialog reusing
 * the same `replaceConfirm*` copy the Advanced Import flow uses, since that
 * mode permanently clears existing bookmarks before restoring; canceling
 * discards the picked file without importing anything.
 * @returns The default-mode select, the quick-import button and its hidden
 * file input, and the replace confirmation dialog.
 */
export function ImportBookmarksButton() {
  const fileInputReference = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useStorageItem(defaultImportModeStore)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)

  const handleButtonClick = () => {
    fileInputReference.current?.click()
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    event.target.value = ''

    try {
      const text = await file.text()
      const format = detectFormat(text, file.type)

      if (format === 'unknown') {
        throw new Error(i18n.t('unsupportedFileFormat'))
      }

      const preview = getImportPreview(text, file.type)
      const effectiveMode: ImportMode = preview.hasLocationData
        ? mode
        : 'folder'

      if (effectiveMode === 'restore-replace') {
        setPendingImport({ format, text, mode: effectiveMode })
        return
      }

      await runImport(format, text, effectiveMode)
      alert(i18n.t('bookmarksImportedSuccessfully'))
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleConfirmReplace = async () => {
    if (!pendingImport) return
    const { format, text, mode: importMode } = pendingImport
    setPendingImport(null)

    try {
      await runImport(format, text, importMode)
      alert(i18n.t('bookmarksImportedSuccessfully'))
    } catch (error) {
      alert((error as Error).message)
    }
  }

  return (
    <>
      <input
        ref={fileInputReference}
        type="file"
        accept=".csv,.json,.html,.htm"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-2">
        <Select
          value={mode}
          onValueChange={(value) => void setMode(value as ImportMode)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder={i18n.t('defaultImportMode')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="folder">{i18n.t('importModeFolder')}</SelectItem>
            <SelectItem value="restore-merge">
              {i18n.t('importModeRestoreMerge')}
            </SelectItem>
            <SelectItem value="restore-replace">
              {i18n.t('importModeRestoreReplace')}
            </SelectItem>
          </SelectContent>
        </Select>

        {mode === 'restore-replace' && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">
              {i18n.t('importModeRestoreReplaceWarning')}
            </p>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        className="w-full"
      >
        <Upload className="mr-2 size-4" />
        {i18n.t('importBookmarks')}
      </Button>

      <Dialog
        open={!!pendingImport}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingImport(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n.t('replaceConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {i18n.t('replaceConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              {i18n.t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmReplace}>
              {i18n.t('replaceConfirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
