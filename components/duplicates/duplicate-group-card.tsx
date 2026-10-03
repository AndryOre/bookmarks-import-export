import { i18n } from '#i18n'
import { useId } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getKeptCopyId } from '@/lib/duplicate-selection'
import type { KeptCopyIds } from '@/lib/duplicate-selection'
import type { DuplicateGroup } from '@/lib/duplicates'

type DuplicateCopy = DuplicateGroup['copies'][number]

function formatDateAdded(dateAdded: number | undefined): string {
  if (dateAdded === undefined) return ''
  return i18n.t('duplicates_added', [
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
      new Date(dateAdded),
    ),
  ])
}

interface DuplicateCopyRowProperties {
  copy: DuplicateCopy
  isKept: boolean
  normalizedUrl: string
}

function DuplicateCopyRow({
  copy,
  isKept,
  normalizedUrl,
}: DuplicateCopyRowProperties) {
  const titleId = useId()
  const folder = copy.folderPath.join(' / ')
  const details = [
    copy.url === normalizedUrl ? '' : copy.url,
    folder,
    formatDateAdded(copy.dateAdded),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      data-kept={isKept}
      className="flex items-center gap-3 rounded-md border p-3 data-[kept=false]:bg-destructive/5"
    >
      <RadioGroupItem value={copy.id} aria-labelledby={titleId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span id={titleId} className="truncate text-sm font-medium">
          {copy.title || copy.url}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {details}
        </span>
      </div>
      <Badge variant={isKept ? 'secondary' : 'destructive'}>
        {isKept ? i18n.t('duplicates_keep') : i18n.t('duplicates_delete')}
      </Badge>
    </div>
  )
}

interface DuplicateGroupCardProperties {
  group: DuplicateGroup
  keptCopyIds: KeptCopyIds
  onKeepChange: (normalizedUrl: string, copyId: string) => void
}

/**
 * One Duplicate group: the normalized address, a copies badge and a radio
 * per copy choosing which one to keep. Copies not chosen are marked Delete.
 * @param root0 This component's properties.
 * @param root0.group The Duplicate group to show.
 * @param root0.keptCopyIds The user's explicit choices; unset groups keep the
 *   oldest copy.
 * @param root0.onKeepChange Called with the group key and the copy to keep.
 * @returns The card listing the group and its copies.
 */
export function DuplicateGroupCard({
  group,
  keptCopyIds,
  onKeepChange,
}: DuplicateGroupCardProperties) {
  const keptId = getKeptCopyId(group, keptCopyIds)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="block truncate">{group.normalizedUrl}</span>
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {i18n.t('duplicates_copiesBadge', [group.copies.length.toString()])}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={keptId}
          onValueChange={(value) =>
            onKeepChange(group.normalizedUrl, String(value))
          }
          aria-label={i18n.t('duplicates_groupLabel', [group.normalizedUrl])}
        >
          {group.copies.map((copy) => (
            <DuplicateCopyRow
              key={copy.id}
              copy={copy}
              isKept={copy.id === keptId}
              normalizedUrl={group.normalizedUrl}
            />
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
