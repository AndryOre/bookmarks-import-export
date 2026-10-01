import { i18n } from '#i18n'
import {
  CalendarClockIcon,
  ChevronRightIcon,
  CircleAlertIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { APP_ROUTES, getAppUrl } from '@/lib/app-url'
import { readAutoExportLastRun } from '@/lib/auto-export'
import { resolvePopupStatus } from '@/lib/popup-status'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
} from '@/lib/storage'
import type { AutoExportLastRun } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

function useAutoExportLastRun(): AutoExportLastRun | null {
  const [lastRun, setLastRun] = useState<AutoExportLastRun | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const value = await readAutoExportLastRun()
      if (isMounted) setLastRun(value)
    }
    void load()
    const unwatch = autoExportLastRunStore.watch(() => {
      void load()
    })
    return () => {
      isMounted = false
      unwatch()
    }
  }, [])

  return lastRun
}

function formatShortDateTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(at))
}

/**
 * Popup status item reporting auto-export's state (next run, off, or last
 * run failed) as a muted `Item` that opens the App's Auto-export route in a
 * new tab.
 * @returns The status item link.
 */
export function AutoExportStatusItem() {
  const [config] = useStorageItem(autoExportConfigStore)
  const [nextRun] = useStorageItem(autoExportNextRunStore)
  const lastRun = useAutoExportLastRun()
  const status = resolvePopupStatus({ config, nextRun, lastRun })

  let title: string
  let description: string
  switch (status.kind) {
    case 'failed': {
      title = i18n.t('popup_statusFailedTitle')
      description = i18n.t('popup_statusFailedDescription')
      break
    }
    case 'next-run': {
      title = i18n.t('popup_statusNextRunTitle')
      description = formatShortDateTime(status.nextRun)
      break
    }
    case 'off': {
      title = i18n.t('popup_statusOffTitle')
      description = i18n.t('popup_statusOffDescription')
      break
    }
  }

  return (
    <Item
      variant="muted"
      size="sm"
      render={
        // eslint-disable-next-line jsx-a11y/anchor-has-content -- Item's render prop injects the children into this anchor
        <a
          href={getAppUrl(APP_ROUTES.autoExport)}
          target="_blank"
          rel="noreferrer"
        />
      }
    >
      <ItemMedia variant="icon">
        {status.kind === 'failed' ? (
          <CircleAlertIcon className="text-destructive" />
        ) : (
          <CalendarClockIcon />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <ChevronRightIcon />
      </ItemActions>
    </Item>
  )
}
