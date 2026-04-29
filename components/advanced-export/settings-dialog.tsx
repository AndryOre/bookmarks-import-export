import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { i18n } from '#i18n';
import { useStorageItem } from '@/lib/use-storage-item';
import {
  showBookmarkIconStore,
  autoExpandFoldersStore,
  includeIconDataStore,
  includeDateAddedStore,
  includeDateLastUsedStore,
  includeDateGroupModifiedStore,
  hideOtherBookmarksStore,
  hideParentFolderStore,
  exportFilenameTemplateStore,
} from '@/lib/storage';
import { formatFilenameTemplate } from '@/lib/filename-template';
import type { SettingsDialogProps } from '@/lib/types';

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [showBookmarkIcon, setShowBookmarkIcon] = useStorageItem(showBookmarkIconStore);
  const [autoExpandFolders, setAutoExpandFolders] = useStorageItem(autoExpandFoldersStore);
  const [includeIconData, setIncludeIconData] = useStorageItem(includeIconDataStore);
  const [includeDateAdded, setIncludeDateAdded] = useStorageItem(includeDateAddedStore);
  const [includeDateLastUsed, setIncludeDateLastUsed] = useStorageItem(includeDateLastUsedStore);
  const [includeDateGroupModified, setIncludeDateGroupModified] = useStorageItem(includeDateGroupModifiedStore);
  const [hideOtherBookmarks, setHideOtherBookmarks] = useStorageItem(hideOtherBookmarksStore);
  const [hideParentFolder, setHideParentFolder] = useStorageItem(hideParentFolderStore);
  const [filenameTemplate, setFilenameTemplate] = useStorageItem(exportFilenameTemplateStore);
  const [localTemplate, setLocalTemplate] = useState(filenameTemplate);

  useEffect(() => {
    setLocalTemplate(filenameTemplate);
  }, [filenameTemplate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i18n.t('settings')}</DialogTitle>
          <DialogDescription className="sr-only">{i18n.t('settingsDescription')}</DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <Tabs defaultValue="display">
            <TabsList className="w-full">
              <TabsTrigger value="display" className="flex-1">
                {i18n.t('display')}
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1">
                {i18n.t('export')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="space-y-4 pt-2">
              <SettingRow
                labelKey="showBookmarkIcon"
                descKey="showBookmarkIconDescription"
                checked={showBookmarkIcon}
                onCheckedChange={setShowBookmarkIcon}
              />
              <SettingRow
                labelKey="autoExpandFolders"
                descKey="autoExpandFoldersDescription"
                tooltipKey="autoExpandFoldersTooltip"
                checked={autoExpandFolders}
                onCheckedChange={setAutoExpandFolders}
              />
            </TabsContent>

            <TabsContent value="export" className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-sm font-medium">
                    {i18n.t('exportFilenameTemplate')}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{i18n.t('exportFilenameTemplateTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{i18n.t('exportFilenameTemplateDescription')}</p>
                <Input
                  value={localTemplate}
                  onChange={(e) => setLocalTemplate(e.target.value)}
                  onBlur={() => setFilenameTemplate(localTemplate)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {i18n.t('exportFilenameTemplatePreview')}{' '}
                  <span className="font-mono">{formatFilenameTemplate(localTemplate)}.html</span>
                </p>
              </div>

              <Separator />

              <SettingRow
                labelKey="includeIconData"
                descKey="includeIconDataDescription"
                tooltipKey="includeIconDataTooltip"
                checked={includeIconData}
                onCheckedChange={setIncludeIconData}
              />
              <SettingRow
                labelKey="includeDateAdded"
                descKey="includeDateAddedDescription"
                checked={includeDateAdded}
                onCheckedChange={setIncludeDateAdded}
              />
              <SettingRow
                labelKey="includeDateLastUsed"
                descKey="includeDateLastUsedDescription"
                checked={includeDateLastUsed}
                onCheckedChange={setIncludeDateLastUsed}
              />

              <Separator />

              <SettingRow
                labelKey="includeDateGroupModified"
                descKey="includeDateGroupModifiedDescription"
                tooltipKey="includeDateGroupModifiedTooltip"
                checked={includeDateGroupModified}
                onCheckedChange={setIncludeDateGroupModified}
              />
              <SettingRow
                labelKey="hideOtherBookmarks"
                descKey="hideOtherBookmarksDescription"
                tooltipKey="hideOtherBookmarksTooltip"
                checked={hideOtherBookmarks}
                onCheckedChange={setHideOtherBookmarks}
              />
              <SettingRow
                labelKey="hideParentFolder"
                descKey="hideParentFolderDescription"
                tooltipKey="hideParentFolderTooltip"
                checked={hideParentFolder}
                onCheckedChange={setHideParentFolder}
              />
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

interface SettingRowProps {
  labelKey: string;
  descKey: string;
  tooltipKey?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => Promise<void>;
}

function SettingRow({ labelKey, descKey, tooltipKey, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1">
          <Label className="text-sm font-medium">{i18n.t(labelKey as any)}</Label>
          {tooltipKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{i18n.t(tooltipKey as any)}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{i18n.t(descKey as any)}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
