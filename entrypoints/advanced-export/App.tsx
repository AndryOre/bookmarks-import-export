import { useRef, useState } from 'react';
import { Header } from '@/components/advanced-export/header';
import { BookmarkTree } from '@/components/advanced-export/bookmark-tree';
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
import { i18n } from '#i18n';
import type { BookmarkFormat, BookmarkTreeHandle } from '@/lib/types';

export default function App() {
  const treeRef = useRef<BookmarkTreeHandle>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [includeIconData] = useStorageItem(includeIconDataStore);
  const [includeDateAdded] = useStorageItem(includeDateAddedStore);
  const [includeDateLastUsed] = useStorageItem(includeDateLastUsedStore);
  const [includeDateGroupModified] = useStorageItem(includeDateGroupModifiedStore);
  const [hideOtherBookmarks] = useStorageItem(hideOtherBookmarksStore);
  const [hideParentFolder] = useStorageItem(hideParentFolderStore);

  const handleExport = async (format: BookmarkFormat) => {
    const tree = treeRef.current;
    if (!tree) return;

    const selectedBookmarks = await tree.getSelectedBookmarks();

    if (selectedBookmarks.length === 0) {
      alert(i18n.t('noBookmarksSelected'));
      return;
    }

    try {
      let content: string;
      let mimeType: string;
      let fileName: string;

      const baseOptions = {
        selectedBookmarks,
        includeIconData,
        includeDateAdded,
        includeDateLastUsed,
        hideParentFolder,
      };

      switch (format) {
        case 'html': {
          content = await exportToHTML({
            ...baseOptions,
            includeDateGroupModified,
            hideOtherBookmarks,
          });
          mimeType = 'text/html';
          fileName = i18n.t('exportFileNameHTML');
          break;
        }
        case 'json': {
          const data = await exportToJSON({
            ...baseOptions,
            includeDateGroupModified,
            hideOtherBookmarks,
          });
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          fileName = i18n.t('exportFileNameJSON');
          break;
        }
        case 'csv': {
          content = await exportToCSV({
            ...baseOptions,
            includeDateLastUsed,
          });
          mimeType = 'text/csv';
          fileName = i18n.t('exportFileNameCSV');
          break;
        }
        default:
          return;
      }

      downloadFile(content, mimeType, fileName);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleRefresh = async () => {
    await treeRef.current?.refresh();
  };

  const handleSelectAll = () => {
    treeRef.current?.selectAll();
  };

  const handleDeselectAll = () => {
    treeRef.current?.deselectAll();
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Header
        selectedCount={selectedCount}
        totalCount={totalCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onExport={handleExport}
      />

      <BookmarkTree
        ref={treeRef}
        searchTerm={searchTerm}
        onSelectionChange={setSelectedCount}
        onTotalChange={setTotalCount}
      />
    </div>
  );
}

function downloadFile(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
