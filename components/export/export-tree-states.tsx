import { i18n } from '#i18n'
import { Link } from '@tanstack/react-router'
import { BookmarkXIcon, SearchXIcon, TriangleAlertIcon } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_ROUTES } from '@/lib/app-url'
import { cn } from '@/lib/utils'

interface SkeletonRowProperties {
  indentClassName: string
  children: React.ReactNode
}

function SkeletonRow({ indentClassName, children }: SkeletonRowProperties) {
  return (
    <div
      className={cn('flex h-7.5 items-center gap-1.5 px-1', indentClassName)}
    >
      <Skeleton className="size-4" />
      <Skeleton className="size-4" />
      {children}
    </div>
  )
}

/**
 * Loading placeholder for the bookmark tree: skeleton rows that mirror the
 * tree's checkbox, icon and indentation.
 * @returns The skeleton rows.
 */
export function ExportTreeSkeleton() {
  return (
    <div
      className="flex flex-col p-2"
      role="status"
      aria-label={i18n.t('exportPage_loading')}
    >
      <SkeletonRow indentClassName="ml-0">
        <Skeleton className="h-3 w-40" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-4">
        <Skeleton className="h-3 w-56" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-4">
        <Skeleton className="h-3 w-48" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-8">
        <Skeleton className="h-3 w-64" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-8">
        <Skeleton className="h-3 w-44" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-0">
        <Skeleton className="h-3 w-36" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-4">
        <Skeleton className="h-3 w-52" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-4">
        <Skeleton className="h-3 w-60" />
      </SkeletonRow>
      <SkeletonRow indentClassName="ml-0">
        <Skeleton className="h-3 w-32" />
      </SkeletonRow>
    </div>
  )
}

interface ExportTreeEmptyProperties {
  searchTerm: string
  onClearSearch: () => void
}

/**
 * Empty state shown when the active search matches no bookmark, with an
 * action that clears the search.
 * @param properties The empty-state props.
 * @param properties.searchTerm The search term that matched nothing.
 * @param properties.onClearSearch Called when "Clear search" is pressed.
 * @returns The empty state markup.
 */
export function ExportTreeEmpty({
  searchTerm,
  onClearSearch,
}: ExportTreeEmptyProperties) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          {i18n.t('exportPage_noResultsTitle', [searchTerm.trim()])}
        </EmptyTitle>
        <EmptyDescription>
          {i18n.t('exportPage_noResultsDescription')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onClearSearch}>
          {i18n.t('exportPage_clearSearch')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * Empty state shown when the browser profile has no bookmarks at all, with a
 * link to the Import page.
 * @returns The empty state markup.
 */
export function ExportTreeNoBookmarks() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookmarkXIcon />
        </EmptyMedia>
        <EmptyTitle>{i18n.t('exportPage_emptyTitle')}</EmptyTitle>
        <EmptyDescription>
          {i18n.t('exportPage_emptyDescription')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          to={APP_ROUTES.import}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {i18n.t('exportPage_goToImport')}
        </Link>
      </EmptyContent>
    </Empty>
  )
}

interface ExportTreeErrorProperties {
  onRetry: () => void
}

/**
 * Error state shown when `bookmarks.getTree` fails, with an action that
 * reloads the tree.
 * @param properties The error-state props.
 * @param properties.onRetry Called when "Try again" is pressed.
 * @returns The error state markup.
 */
export function ExportTreeError({ onRetry }: ExportTreeErrorProperties) {
  return (
    <Empty role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{i18n.t('exportPage_errorTitle')}</EmptyTitle>
        <EmptyDescription>
          {i18n.t('exportPage_errorDescription')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {i18n.t('exportPage_tryAgain')}
        </Button>
      </EmptyContent>
    </Empty>
  )
}
