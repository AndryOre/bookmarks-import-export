import { i18n } from '#i18n'
import { useId } from 'react'

import { SafetySnapshotCard } from '@/components/safety-snapshot-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getImportModeItems } from '@/lib/import-mode-items'
import {
  autoExpandFoldersStore,
  defaultImportModeStore,
  showBookmarkIconStore,
  themeStore,
} from '@/lib/storage'
import type { ImportMode } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

type ThemeChoice = 'dark' | 'light' | 'system'

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'settingsPage_themeSystem' },
  { value: 'light', label: 'settingsPage_themeLight' },
  { value: 'dark', label: 'settingsPage_themeDark' },
]

/**
 * The Settings screen: theme, bookmark tree display and the default import
 * mode, plus the Safety snapshot card. Every control writes straight to its storage item on change; the
 * `ThemeProvider` watches the theme store, so the choice applies live.
 * @returns The settings view.
 */
export function SettingsRoute() {
  const modeSelectId = useId()
  const iconSwitchId = useId()
  const expandSwitchId = useId()
  const [theme, setTheme] = useStorageItem(themeStore)
  const [showIcon, setShowIcon] = useStorageItem(showBookmarkIconStore)
  const [autoExpand, setAutoExpand] = useStorageItem(autoExpandFoldersStore)
  const [mode, setMode] = useStorageItem(defaultImportModeStore)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{i18n.t('settingsPage_appearanceTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend variant="label">
              {i18n.t('settingsPage_theme')}
            </FieldLegend>
            <FieldDescription>
              {i18n.t('settingsPage_themeDescription')}
            </FieldDescription>
            <ToggleGroup
              variant="outline"
              aria-label={i18n.t('settingsPage_theme')}
              value={[theme]}
              onValueChange={(value) => {
                const [next] = value as ThemeChoice[]
                if (next) void setTheme(next)
              }}
            >
              {THEME_OPTIONS.map(({ value, label }) => (
                <ToggleGroupItem key={value} value={value}>
                  {i18n.t(label as 'settingsPage_themeSystem')}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{i18n.t('settingsPage_treeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={iconSwitchId}>
                  {i18n.t('showBookmarkIcon')}
                </FieldLabel>
                <FieldDescription>
                  {i18n.t('showBookmarkIconDescription')}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={iconSwitchId}
                checked={showIcon}
                onCheckedChange={(checked) => void setShowIcon(checked)}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={expandSwitchId}>
                  {i18n.t('autoExpandFolders')}
                </FieldLabel>
                <FieldDescription>
                  {i18n.t('autoExpandFoldersDescription')}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={expandSwitchId}
                checked={autoExpand}
                onCheckedChange={(checked) => void setAutoExpand(checked)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{i18n.t('settingsPage_importTitle')}</CardTitle>
          <CardDescription>
            {i18n.t('settingsPage_importDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor={modeSelectId}>
              {i18n.t('defaultImportMode')}
            </FieldLabel>
            <Select
              items={getImportModeItems()}
              value={mode}
              onValueChange={(value) => void setMode(value as ImportMode)}
            >
              <SelectTrigger id={modeSelectId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="folder">
                    {i18n.t('importModeFolder')}
                  </SelectItem>
                  <SelectItem value="restore-merge">
                    {i18n.t('importModeRestoreMerge')}
                  </SelectItem>
                  <SelectItem value="restore-replace">
                    {i18n.t('importModeRestoreReplace')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {i18n.t('settingsPage_importModeHelp')}
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <SafetySnapshotCard />
    </div>
  )
}
