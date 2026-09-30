import { i18n } from '#i18n'
import { Bookmark, Folder } from 'lucide-react'

import type { ImportPreview } from '@/lib/types'

interface ImportPreviewProperties {
  preview: ImportPreview | null
}

export function ImportPreviewPanel({ preview }: ImportPreviewProperties) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{i18n.t('importPreview')}</p>

      {preview ? (
        preview.hasLocationData ? (
          <div className="space-y-2">
            <PreviewRow
              icon={<Folder className="size-4 text-muted-foreground" />}
              label={i18n.t('bookmarksBar')}
              count={preview.bookmarksBarCount}
            />
            <PreviewRow
              icon={<Folder className="size-4 text-muted-foreground" />}
              label={i18n.t('otherBookmarks')}
              count={preview.otherBookmarksCount}
            />
            {preview.mobileBookmarksCount > 0 && (
              <PreviewRow
                icon={<Folder className="size-4 text-muted-foreground" />}
                label={i18n.t('mobileBookmarks')}
                count={preview.mobileBookmarksCount}
              />
            )}
          </div>
        ) : (
          <PreviewRow
            icon={<Bookmark className="size-4 text-muted-foreground" />}
            label={i18n.t('importedBookmarks')}
            count={preview.totalCount}
          />
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          {i18n.t('importPreviewNoFile')}
        </p>
      )}
    </div>
  )
}

interface PreviewRowProperties {
  icon: React.ReactNode
  label: string
  count: number
}

function PreviewRow({ icon, label, count }: PreviewRowProperties) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2.5">
      {icon}
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {i18n.t('importPreviewCount', [count.toString()])}
      </span>
    </div>
  )
}
