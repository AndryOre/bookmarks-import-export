import { i18n } from '#i18n'
import { FileCheck, FileUp } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

interface FileDropZoneProperties {
  file: File | null
  onFile: (file: File) => void
}

export function FileDropZone({ file, onFile }: FileDropZoneProperties) {
  const fileInputReference = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) onFile(selected)
    event.target.value = ''
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <FileCheck className="size-5 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm font-medium">{file.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputReference.current?.click()}
        >
          {i18n.t('changeFile')}
        </Button>
        <input
          ref={fileInputReference}
          type="file"
          accept=".csv,.json,.html,.htm"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    )
  }

  return (
    // A native <label> targeting the hidden file input makes the whole
    // zone clickable/keyboard-activatable without a manual click handler
    // or extra role/tabIndex/keyboard wiring — drag-and-drop is layered on
    // top via the drag event handlers.
    <label
      htmlFor="file-drop-zone-input"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition-colors select-none',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground hover:bg-muted/20',
      ].join(' ')}
    >
      <FileUp className="size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{i18n.t('dropFileHere')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {i18n.t('orClickToSelect')}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {i18n.t('supportedFormats')}
      </p>
      <input
        id="file-drop-zone-input"
        ref={fileInputReference}
        type="file"
        accept=".csv,.json,.html,.htm"
        className="hidden"
        onChange={handleChange}
      />
    </label>
  )
}
