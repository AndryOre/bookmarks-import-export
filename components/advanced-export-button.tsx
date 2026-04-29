import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { i18n } from '#i18n';

export function AdvancedExportButton() {
  const handleClick = () => {
    browser.tabs.create({
      url: browser.runtime.getURL('/advanced-export.html' as any),
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} className="w-full">
      <Settings2 className="size-4 mr-2" />
      {i18n.t('advancedExport')}
    </Button>
  );
}
