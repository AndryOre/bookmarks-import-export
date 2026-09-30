import { i18n } from '#i18n'
import { CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

import { FileDropZone } from '@/components/advanced-import/file-drop-zone'
import { Header } from '@/components/advanced-import/header'
import { ImportModeSelector } from '@/components/advanced-import/import-mode-selector'
import { ImportPreviewPanel } from '@/components/advanced-import/import-preview'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { detectFormat } from '@/lib/detect-format'
import { getImportPreview } from '@/lib/import-preview'
import { importFromCSV } from '@/lib/importers/import-csv'
import { importFromHTML } from '@/lib/importers/import-html'
import { importFromJSON } from '@/lib/importers/import-json'
import type { ImportMode, ImportPreview } from '@/lib/types'

type ImportStatus = 'idle' | 'importing' | 'success' | 'error'

/**
 * Advanced Import page: lets the user pick a bookmarks file, choose an
 * import mode, preview what will be imported, and run the import.
 * Choosing `restore-replace` — which clears the existing bookmark roots
 * before importing — first opens a confirmation dialog, since that mode is
 * destructive and cannot be undone.
 * @returns The Advanced Import page.
 */
export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [fileText, setFileText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<ImportMode>('folder')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const handleFile = async (selected: File) => {
    const text = await selected.text()
    const parsed = getImportPreview(text, selected.type)

    setFile(selected)
    setFileText(text)
    setPreview(parsed)
    setStatus('idle')
    setErrorMessage('')

    if (!parsed.hasLocationData) {
      setMode('folder')
    }
  }

  const handleImportClick = () => {
    if (mode === 'restore-replace') {
      setShowConfirm(true)
    } else {
      void executeImport()
    }
  }

  const executeImport = async () => {
    if (!file || !fileText) return

    setStatus('importing')
    setErrorMessage('')

    try {
      const format = detectFormat(fileText, file.type)

      switch (format) {
        case 'html': {
          await importFromHTML(fileText, mode)
          break
        }
        case 'json': {
          await importFromJSON(JSON.parse(fileText), mode)
          break
        }
        case 'csv': {
          await importFromCSV(fileText)
          break
        }
        default: {
          throw new Error(i18n.t('unsupportedFileFormat'))
        }
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage((error as Error).message)
    }
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    void executeImport()
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        canImport={!!file && status !== 'importing'}
        isImporting={status === 'importing'}
        onImport={handleImportClick}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <FileDropZone file={file} onFile={handleFile} />

          {preview && (
            <div className="grid grid-cols-2 gap-4">
              <ImportModeSelector
                value={mode}
                onChange={setMode}
                hasLocationData={preview.hasLocationData}
              />
              <ImportPreviewPanel preview={preview} />
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3">
              <CheckCircle className="size-5 shrink-0 text-success" />
              <p className="text-sm text-success">
                {i18n.t('bookmarksImportedSuccessfully')}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i18n.t('replaceConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {i18n.t('replaceConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              {i18n.t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              {i18n.t('replaceConfirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
