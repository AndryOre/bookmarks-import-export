import { useState } from 'react';
import { RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportFormatSelector } from '@/components/export-format-selector';
import { SearchBar } from './search-bar';
import { SettingsDialog } from './settings-dialog';
import { i18n } from '#i18n';
import type { HeaderProps } from '@/lib/types';

export function Header({
  selectedCount,
  totalCount,
  searchTerm,
  onSearchChange,
  onRefresh,
  onSelectAll,
  onDeselectAll,
  onExport,
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <img
          src={browser.runtime.getURL('/icon/48.png')}
          alt=""
          className="size-6"
          aria-hidden="true"
        />
        <span className="font-semibold text-sm">{i18n.t('extensionName')}</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label={i18n.t('settings')}
        >
          <Settings className="size-4" />
        </Button>

        <ExportFormatSelector onExport={onExport} />
      </div>

      <div className="flex items-center gap-2">
        <SearchBar value={searchTerm} onChange={onSearchChange} />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label={i18n.t('refresh')}
        >
          <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>

        <Button variant="outline" size="sm" onClick={onSelectAll}>
          {i18n.t('selectAll')}
        </Button>

        <Button variant="outline" size="sm" onClick={onDeselectAll}>
          {i18n.t('deselectAll')}
        </Button>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {selectedCount} / {totalCount}
        </span>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
