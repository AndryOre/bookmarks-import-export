import { i18n } from '#i18n'
import { useEffect, useState } from 'react'

import { readAutoExportLastRun } from '@/lib/auto-export'
import {
  autoExportConfigStore,
  autoExportLastRunStore,
  autoExportNextRunStore,
} from '@/lib/storage'
import type { AutoExportLastRun } from '@/lib/types'
import { useStorageItem } from '@/lib/use-storage-item'

/**
 * Mirrors {@link readAutoExportLastRun}'s normalized value as React state,
 * re-reading it every time `autoExportLastRunStore` changes. Kept local to
 * this component rather than added to `useStorageItem` since it needs the
 * async migration `readAutoExportLastRun` performs, not a raw storage read.
 * @returns The normalized last auto-export run, or `null` if it never ran.
 */
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

/**
 * Opens the Advanced Export page's Auto Export settings tab in a new tab,
 * via the `?settings=auto-export` URL contract the settings page will read
 * (a later ticket wires up the page side of this contract).
 */
function openAutoExportSettings(): void {
  void browser.tabs.create({
    url: `${browser.runtime.getURL('/advanced-export.html')}?settings=auto-export`,
  })
}

/**
 * Formats an epoch-millisecond timestamp as a short, locale-aware date and
 * time (e.g. "9/30/26, 6:00 PM"), for the "next run" status text.
 * @param at Epoch milliseconds to format.
 * @returns The formatted short date/time string.
 */
function formatShortDateTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(at))
}

/**
 * Popup footer status line (design canvas `AutoExport.dc.html`, artboard
 * A2): a single truncating line reporting auto-export's current state from
 * {@link autoExportConfigStore}, {@link autoExportNextRunStore}, and the
 * last run recorded via {@link readAutoExportLastRun}. Clicking it opens
 * the Auto Export settings tab in a new tab. A failed last run takes
 * priority over showing the next scheduled run.
 * @returns The footer status line element.
 */
export function AutoExportStatusLine() {
  const [config] = useStorageItem(autoExportConfigStore)
  const [nextRun] = useStorageItem(autoExportNextRunStore)
  const lastRun = useAutoExportLastRun()

  const hasLastRunFailed = lastRun !== null && !lastRun.ok

  let text: string
  let hasFailureDot = false

  if (hasLastRunFailed) {
    text = i18n.t('autoExportStatusFailed')
    hasFailureDot = true
  } else if (nextRun !== null && config.enabled) {
    text = i18n.t('autoExportStatusNextRun', [formatShortDateTime(nextRun)])
  } else {
    text = i18n.t('autoExportStatusDisabled')
  }

  return (
    <button
      type="button"
      onClick={openAutoExportSettings}
      className="mt-2 flex w-full shrink-0 items-center gap-1.5 truncate text-left text-xs text-muted-foreground hover:text-foreground"
    >
      {hasFailureDot && (
        <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
      )}
      <span className="truncate">{text}</span>
    </button>
  )
}
