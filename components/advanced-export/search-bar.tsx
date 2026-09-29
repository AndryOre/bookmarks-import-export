import { i18n } from '#i18n'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import type { SearchBarProperties } from '@/lib/types'

export function SearchBar({ value, onChange }: SearchBarProperties) {
  return (
    <div className="relative">
      <Search
        className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={i18n.t('searchBookmarks')}
        className="h-8 w-48 pl-8"
        aria-label={i18n.t('searchBookmarks')}
      />
    </div>
  )
}
