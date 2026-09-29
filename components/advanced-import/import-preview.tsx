import { i18n } from '#i18n'
import { Bookmark, Folder } from 'lucide-react'

import type { ImportPreview } from '@/lib/types'

interface ImportPreviewProps {
  preview: ImportPreview | null
}

export function ImportPreviewPanel({ preview }: ImportPreviewProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{i18n.t('importPreview')}</p>

      {!preview ? (
        <p className="text-xs text-muted-foreground">
          {i18n.t('importPreviewNoFile')}
        </p>
      ) : preview.hasLocationData ? (
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
        </div>
      ) : (
        <PreviewRow
          icon={<Bookmark className="size-4 text-muted-foreground" />}
          label={i18n.t('importedBookmarks')}
          count={preview.totalCount}
        />
      )}
    </div>
  )
}

interface PreviewRowProps {
  icon: React.ReactNode
  label: string
  count: number
}

function PreviewRow({ icon, label, count }: PreviewRowProps) {
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
