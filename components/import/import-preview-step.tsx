import { i18n } from '#i18n'
import { BookmarkIcon, FolderIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { formatCount } from '@/lib/format-count'
import type { ImportPreview } from '@/lib/types'

interface PreviewRowProperties {
  icon: ReactNode
  label: string
  count: number
}

function PreviewRow({ icon, label, count }: PreviewRowProperties) {
  return (
    <Item variant="muted" size="sm" role="listitem">
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <span className="text-muted-foreground tabular-nums">
          {i18n.t('importPreviewCount', count, [formatCount(count)])}
        </span>
      </ItemActions>
    </Item>
  )
}

/**
 * Summarises what the chosen file contains: one row per bookmark root when
 * the file carries location data, otherwise a single "Imported bookmarks"
 * row with the total.
 * @param root0 This component's properties.
 * @param root0.preview The parsed preview of the chosen file.
 * @returns The list of preview rows.
 */
export function ImportPreviewStep({ preview }: { preview: ImportPreview }) {
  if (!preview.hasLocationData) {
    return (
      <ItemGroup>
        <PreviewRow
          icon={<BookmarkIcon />}
          label={i18n.t('importedBookmarks')}
          count={preview.totalCount}
        />
      </ItemGroup>
    )
  }

  return (
    <ItemGroup>
      <PreviewRow
        icon={<FolderIcon />}
        label={i18n.t('bookmarksBar')}
        count={preview.bookmarksBarCount}
      />
      <PreviewRow
        icon={<FolderIcon />}
        label={i18n.t('otherBookmarks')}
        count={preview.otherBookmarksCount}
      />
      {preview.mobileBookmarksCount > 0 && (
        <PreviewRow
          icon={<FolderIcon />}
          label={i18n.t('mobileBookmarks')}
          count={preview.mobileBookmarksCount}
        />
      )}
    </ItemGroup>
  )
}
