import { i18n } from '#i18n'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface HeaderProps {
  canImport: boolean
  isImporting: boolean
  onImport: () => void
}

export function Header({ canImport, isImporting, onImport }: HeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2">
      <div className="flex shrink-0 items-center gap-2">
        <img
          src={browser.runtime.getURL('/icons/48.png')}
          alt=""
          className="size-6"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold">{i18n.t('extensionName')}</span>
      </div>

      <div className="flex-1" />

      <Button size="sm" onClick={onImport} disabled={!canImport}>
        <Upload className="mr-2 size-4" />
        {isImporting ? '...' : i18n.t('import')}
      </Button>
    </header>
  )
}
