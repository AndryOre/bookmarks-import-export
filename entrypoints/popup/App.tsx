import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportFormatSelector } from '@/components/export-format-selector';
import { AdvancedExportButton } from '@/components/advanced-export-button';
import { ImportBookmarksButton } from '@/components/import-bookmarks-button';
import { i18n } from '#i18n';
import { useStorageItem } from '@/lib/use-storage-item';
import {
  includeIconDataStore,
  includeDateAddedStore,
  includeDateLastUsedStore,
  includeDateGroupModifiedStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
} from '@/lib/storage';
import { exportToHTML } from '@/lib/exporters/export-html';
import { exportToJSON } from '@/lib/exporters/export-json';
import { exportToCSV } from '@/lib/exporters/export-csv';
import type { BookmarkFormat } from '@/lib/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  const [includeIconData] = useStorageItem(includeIconDataStore);
  const [includeDateAdded] = useStorageItem(includeDateAddedStore);
  const [includeDateLastUsed] = useStorageItem(includeDateLastUsedStore);
  const [includeDateGroupModified] = useStorageItem(includeDateGroupModifiedStore);
  const [hideOtherBookmarks] = useStorageItem(hideOtherBookmarksStore);
  const [hideParentFolder] = useStorageItem(hideParentFolderStore);

  const handleExport = async (format: BookmarkFormat) => {
    try {
      let content: string;
      let mimeType: string;
      let fileName: string;

      const baseOptions = {
        selectedBookmarks: null,
        includeIconData,
        includeDateAdded,
        includeDateLastUsed,
        includeDateGroupModified,
        hideOtherBookmarks,
        hideParentFolder,
      };

      switch (format) {
        case 'html': {
          content = await exportToHTML(baseOptions);
          mimeType = 'text/html';
          fileName = i18n.t('exportFileNameHTML');
          break;
        }
        case 'json': {
          const data = await exportToJSON(baseOptions);
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          fileName = i18n.t('exportFileNameJSON');
          break;
        }
        case 'csv': {
          content = await exportToCSV({
            selectedBookmarks: null,
            includeIconData,
            includeDateAdded,
            includeDateLastUsed,
            hideParentFolder,
          });
          mimeType = 'text/csv';
          fileName = i18n.t('exportFileNameCSV');
          break;
        }
        default:
          return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <div className="w-60 h-64 p-3 flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'export' | 'import')}
        className="flex flex-col flex-1"
      >
        <TabsList className="w-full">
          <TabsTrigger value="export" className="flex-1">
            {i18n.t('exportBookmarks')}
          </TabsTrigger>
          <TabsTrigger value="import" className="flex-1">
            {i18n.t('importBookmarks')}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="export"
          className="flex flex-col gap-2 flex-1 mt-2 data-[state=inactive]:hidden"
          forceMount
        >
          <ExportFormatSelector onExport={handleExport} />
          <AdvancedExportButton />
        </TabsContent>

        <TabsContent
          value="import"
          className="flex flex-col gap-2 flex-1 mt-2 data-[state=inactive]:hidden"
          forceMount
        >
          <ImportBookmarksButton />
        </TabsContent>
      </Tabs>
    </div>
  );
}
