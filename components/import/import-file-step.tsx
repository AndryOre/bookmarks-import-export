import { i18n } from '#i18n'
import { FileIcon, FileUpIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { cn } from '@/lib/utils'

const ACCEPTED_FILE_TYPES = '.csv,.json,.html,.htm,.xbel,.xml'

interface ImportFileStepProperties {
  file: File | null
  onFile: (file: File) => void
  disabled: boolean
}

/**
 * Lets the user provide a bookmarks file by dropping it on a dashed zone or
 * clicking it to open the native picker. Once a file is chosen the zone
 * becomes an `Item` with a "Change file" action. The file input stays in the
 * accessibility tree (visually hidden) so the zone is keyboard-operable.
 * @param root0 This component's properties.
 * @param root0.file The chosen file, if any.
 * @param root0.onFile Called with the dropped or picked file.
 * @param root0.disabled Whether picking is disabled (import in flight).
 * @returns The drop zone or the chosen-file row.
 */
export function ImportFileStep({
  file,
  onFile,
  disabled,
}: ImportFileStepProperties) {
  const inputId = useId()
  const inputReference = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const changeFocusRequest = useRef(false)
  const changeButtonReference = useRef<HTMLButtonElement | null>(null)

  const focusChangeButton = (element: HTMLButtonElement | null) => {
    changeButtonReference.current = element
    if (!element || element.disabled || !changeFocusRequest.current) return
    changeFocusRequest.current = false
    element.focus()
  }

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped && !disabled) onFile(dropped)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected) {
      const activeElement = document.activeElement
      changeFocusRequest.current =
        activeElement === event.target ||
        (activeElement !== null &&
          activeElement === changeButtonReference.current)
      onFile(selected)
    }
    event.target.value = ''
  }

  const fileInput = (
    <input
      id={inputId}
      ref={inputReference}
      type="file"
      accept={ACCEPTED_FILE_TYPES}
      className="peer sr-only"
      disabled={disabled}
      aria-label={i18n.t('import_fileInputLabel')}
      onChange={handleChange}
    />
  )

  const body = file ? (
    <Item variant="outline">
      <ItemMedia variant="icon">
        <FileIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="break-all">{file.name}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Button
          ref={focusChangeButton}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputReference.current?.click()}
        >
          {i18n.t('import_changeFile')}
        </Button>
      </ItemActions>
    </Item>
  ) : (
    <label
      htmlFor={inputId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors select-none peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:bg-muted/50',
        isDragging ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <FileUpIcon className="size-8 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium">{i18n.t('dropFileHere')}</span>
      <span className="text-xs text-muted-foreground">
        {i18n.t('orClickToSelect')}
      </span>
      <span className="text-xs text-muted-foreground">
        {i18n.t('supportedFormats')}
      </span>
    </label>
  )

  return (
    <>
      {fileInput}
      {body}
    </>
  )
}
