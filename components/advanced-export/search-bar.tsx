import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { i18n } from '#i18n';
import type { SearchBarProps } from '@/lib/types';

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={i18n.t('searchBookmarks')}
        className="pl-8 h-8 w-48"
        aria-label={i18n.t('searchBookmarks')}
      />
    </div>
  );
}
