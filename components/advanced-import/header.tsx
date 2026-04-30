import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { i18n } from '#i18n';

interface HeaderProps {
  canImport: boolean;
  isImporting: boolean;
  onImport: () => void;
}

export function Header({ canImport, isImporting, onImport }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <img
          src={browser.runtime.getURL('/icons/48.png')}
          alt=""
          className="size-6"
          aria-hidden="true"
        />
        <span className="font-semibold text-sm">{i18n.t('extensionName')}</span>
      </div>

      <div className="flex-1" />

      <Button
        size="sm"
        onClick={onImport}
        disabled={!canImport}
      >
        <Upload className="size-4 mr-2" />
        {isImporting ? '...' : i18n.t('import')}
      </Button>
    </header>
  );
}
