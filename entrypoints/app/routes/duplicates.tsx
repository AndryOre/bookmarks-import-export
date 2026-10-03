import { i18n } from '#i18n'
import { CopyCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { DuplicateGroupCard } from '@/components/duplicates/duplicate-group-card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import {
  deleteBookmarksById,
  getCopyIdsToDelete,
  getReviewedIdsStillToDelete,
} from '@/lib/duplicate-selection'
import type { KeptCopyIds } from '@/lib/duplicate-selection'
import { findDuplicateGroups } from '@/lib/duplicates'
import type { DuplicateGroup } from '@/lib/duplicates'
import { formatCount } from '@/lib/format-count'

function DuplicatesSkeleton() {
  return (
    <div
      role="status"
      aria-label={i18n.t('duplicates_scanning')}
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

interface NoDuplicatesProperties {
  onScanAgain: () => void
}

function NoDuplicates({ onScanAgain }: NoDuplicatesProperties) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CopyCheckIcon />
        </EmptyMedia>
        <EmptyTitle>{i18n.t('duplicates_emptyTitle')}</EmptyTitle>
        <EmptyDescription>
          {i18n.t('duplicates_emptyDescription')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onScanAgain}>
          {i18n.t('duplicates_scanAgain')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function ScanFailed({ onScanAgain }: NoDuplicatesProperties) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{i18n.t('duplicates_scanFailed')}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onScanAgain}>
          {i18n.t('duplicates_scanAgain')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * The Duplicates screen: scans the bookmarks when opened and lists Duplicate
 * groups, each with a radio to choose the copy to keep (the oldest by
 * default). A summary row offers a destructive delete of every other copy,
 * always behind a confirm dialog; only bookmarks are removed, never folders.
 * @returns The scanning, empty or groups view.
 */
export function DuplicatesRoute() {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null)
  const [keptCopyIds, setKeptCopyIds] = useState<KeptCopyIds>({})
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasScanFailed, setHasScanFailed] = useState(false)

  const [scanCount, setScanCount] = useState(0)
  const headingFocusPending = useRef(false)

  const scan = () => {
    setGroups(null)
    setHasScanFailed(false)
    setKeptCopyIds({})
    setScanCount((previous) => previous + 1)
  }

  useEffect(() => {
    let isCurrent = true
    const runScan = async () => {
      try {
        const tree = await browser.bookmarks.getTree()
        if (isCurrent) setGroups(findDuplicateGroups(tree))
      } catch {
        if (isCurrent) setHasScanFailed(true)
      }
      if (!isCurrent || !headingFocusPending.current) return
      headingFocusPending.current = false
      document.querySelector('h1')?.focus()
    }
    void runScan()
    return () => {
      isCurrent = false
    }
  }, [scanCount])

  if (hasScanFailed) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ScanFailed onScanAgain={scan} />
      </div>
    )
  }
  if (groups === null) return <DuplicatesSkeleton />
  if (groups.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <NoDuplicates onScanAgain={scan} />
      </div>
    )
  }

  const idsToDelete = getCopyIdsToDelete(groups, keptCopyIds)
  const copyCount = idsToDelete.length
  const copyCountText = formatCount(copyCount)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      const currentGroups = findDuplicateGroups(
        await browser.bookmarks.getTree(),
      )
      const { deleted, failed } = await deleteBookmarksById(
        getReviewedIdsStillToDelete(idsToDelete, currentGroups, keptCopyIds),
      )
      toast.add(
        failed === 0
          ? {
              type: 'success',
              title: i18n.t('duplicates_deleted', deleted, [
                formatCount(deleted),
              ]),
            }
          : {
              type: 'error',
              title: i18n.t('duplicates_deletedPartial', [
                formatCount(deleted),
                formatCount(failed),
              ]),
            },
      )
    } catch (error) {
      toast.add({
        type: 'error',
        title: i18n.t('duplicates_deleteFailed'),
        description: (error as Error).message,
      })
    } finally {
      setIsDeleting(false)
      setIsConfirmOpen(false)
      headingFocusPending.current = true
      scan()
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isDeleting) return
    setIsConfirmOpen(isOpen)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            {i18n.t('duplicates_summary', [
              formatCount(groups.length),
              copyCountText,
            ])}
          </ItemTitle>
        </ItemContent>
        <ItemActions>
          <Button variant="destructive" onClick={() => setIsConfirmOpen(true)}>
            {i18n.t('duplicates_deleteButton', copyCount, [copyCountText])}
          </Button>
        </ItemActions>
      </Item>

      {groups.map((group) => (
        <DuplicateGroupCard
          key={group.normalizedUrl}
          group={group}
          keptCopyIds={keptCopyIds}
          onKeepChange={(normalizedUrl, copyId) =>
            setKeptCopyIds((previous) => ({
              ...previous,
              [normalizedUrl]: copyId,
            }))
          }
        />
      ))}

      <AlertDialog open={isConfirmOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {i18n.t('duplicates_confirmTitle', copyCount, [copyCountText])}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.t('duplicates_confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {i18n.t('cancel')}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleConfirm()}
            >
              {isDeleting && <Spinner data-icon="inline-start" />}
              {i18n.t('duplicates_deleteButton', copyCount, [copyCountText])}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
