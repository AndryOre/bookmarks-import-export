import { i18n } from '#i18n'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

function handleClick() {
  void browser.tabs.create({
    url: browser.runtime.getURL('/advanced-import.html'),
  })
}

export function AdvancedImportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="w-full"
    >
      <Upload className="mr-2 size-4" />
      {i18n.t('advancedImport')}
    </Button>
  )
}
