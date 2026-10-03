import { i18n } from '#i18n'
import { storage } from '#imports'

import { markImportRestored } from '@/lib/import-control'
import { withImportLock } from '@/lib/import-lock'
import { importFromJSON } from '@/lib/importers/import-json'
import { resolveImportRoots } from '@/lib/importers/resolve-roots'
import { downloadViaOffscreenDocument } from '@/lib/offscreen-download'
import type { ParsedBookmark } from '@/lib/types'

/**
 * The single latest Safety snapshot: the bookmarks-bar, other-bookmarks and,
 * when the browser has one, Mobile roots as taken right before a
 * Restore-replace. `roots` is a valid Snug JSON export (roots carry the fixed
 * ids `'1'`, `'2'` and `'3'`), so the downloaded file can be imported again
 * as-is.
 */
export interface SafetySnapshot {
  takenAt: number
  roots: ParsedBookmark[]
}

/**
 * Storage key of the latest Safety snapshot in `chrome.storage.local`. Only
 * one is ever kept: saving a new one overwrites it.
 */
export const safetySnapshotStore = storage.defineItem<SafetySnapshot | null>(
  'local:safetySnapshot',
  { fallback: null },
)

interface LiveNode {
  title: string
  url?: string
  dateAdded?: number
  children?: LiveNode[]
}

function toParsedBookmark(node: LiveNode): ParsedBookmark {
  return {
    title: node.title,
    dateAdded: node.dateAdded ?? 0,
    ...(node.url !== undefined && { url: node.url }),
    ...(node.children !== undefined && {
      children: node.children.map((child) => toParsedBookmark(child)),
    }),
  }
}

/**
 * Captures the bookmarks-bar, other-bookmarks and Mobile (when present) roots
 * as they are now,
 * preserving folder nesting and order. Empty folders are kept in the capture,
 * but the importer skips them on restore. When the profile has both a local
 * and an account set of roots, every root of both sets is captured, each
 * tagged with its `folderType` and `syncing` so a restore writes it back to
 * its own root.
 * @returns The capture, stamped with the current time.
 * @throws {Error} When either root cannot be found in the bookmarks tree.
 */
export async function captureSafetySnapshot(): Promise<SafetySnapshot> {
  const [treeRoot] = await browser.bookmarks.getTree()
  const rootChildren = treeRoot?.children ?? []
  const { bookmarksBarId, otherBookmarksId, mobileId } =
    resolveImportRoots(rootChildren)
  const barNode = rootChildren.find((node) => node.id === bookmarksBarId)
  const otherNode = rootChildren.find((node) => node.id === otherBookmarksId)
  if (!barNode || !otherNode) {
    throw new Error(i18n.t('importFromJSONProcessError'))
  }
  const mobileNode = mobileId
    ? rootChildren.find((node) => node.id === mobileId)
    : undefined

  const takenAt = Date.now()
  if (hasSeveralSets(rootChildren)) {
    return {
      takenAt,
      roots: rootChildren
        .filter((node) => ROOT_FOLDER_TYPES.includes(node.folderType ?? ''))
        .map((node) => ({
          ...toParsedBookmark(node),
          id: node.id,
          folderType: node.folderType,
          syncing: node.syncing,
        })),
    }
  }

  return {
    takenAt,
    roots: [
      { ...toParsedBookmark(barNode), id: '1' },
      { ...toParsedBookmark(otherNode), id: '2' },
      ...(mobileNode ? [{ ...toParsedBookmark(mobileNode), id: '3' }] : []),
    ],
  }
}

const ROOT_FOLDER_TYPES = ['bookmarks-bar', 'other', 'mobile']

function hasSeveralSets(rootChildren: { folderType?: string }[]): boolean {
  return ROOT_FOLDER_TYPES.some(
    (folderType) =>
      rootChildren.filter((node) => node.folderType === folderType).length > 1,
  )
}

function snapshotFileName(takenAt: number): string {
  const stamp = new Date(takenAt).toISOString().replaceAll(/[:.]/g, '-')
  return `snug-safety-snapshot-${stamp}.json`
}

/**
 * Takes a Safety snapshot: captures the two roots, saves them as a JSON file
 * in Downloads, then stores them as the latest snapshot in
 * `chrome.storage.local`, overwriting the previous one. The file goes first so
 * a failed download leaves the previous stored snapshot untouched.
 * @returns The snapshot that was saved.
 * @throws {Error} With a localized message when the snapshot cannot be saved.
 */
export async function takeSafetySnapshot(): Promise<SafetySnapshot> {
  try {
    const snapshot = await captureSafetySnapshot()
    await downloadViaOffscreenDocument(
      JSON.stringify(snapshot.roots, null, 2),
      'application/json',
      snapshotFileName(snapshot.takenAt),
    )
    await safetySnapshotStore.setValue(snapshot)
    return snapshot
  } catch (error) {
    throw new Error(
      i18n.t('safetySnapshotFailed', [(error as Error).message]),
      { cause: error },
    )
  }
}

/**
 * Reads the latest stored Safety snapshot.
 * @returns The snapshot, or `null` when none has been taken yet.
 */
export function readLatestSafetySnapshot(): Promise<SafetySnapshot | null> {
  return safetySnapshotStore.getValue()
}

/**
 * Rewrites the roots from `roots` and reports whether every node was written.
 * @param roots The snapshot roots to write.
 * @param onClearingExisting Called right before existing content is deleted.
 * @returns True when no node was dropped.
 */
export async function hasRewrittenRootsFully(
  roots: ParsedBookmark[],
  onClearingExisting?: () => void,
): Promise<boolean> {
  const result = await importFromJSON(
    structuredClone(roots),
    'restore-replace',
    {
      trusted: true,
      onClearingExisting,
    },
  )
  return result.skippedInvalidUrl === 0
}

/**
 * Restores a snapshot into the bookmarks bar, other bookmarks and, when the
 * snapshot has it, Mobile, replacing their current content. URLs are written
 * as-is, so bookmarklets and `chrome://` bookmarks survive. This is itself a
 * Restore-replace, so it holds the shared import lock, and a new Safety
 * snapshot of the current state is taken first; nothing is deleted if that
 * fails. When the rewrite fails after existing content was cleared, the
 * just-taken snapshot is restored and the original error is rethrown, marked
 * with `markImportRestored` when the recovery was complete.
 * @param snapshot The snapshot to restore.
 * @returns Resolves once the roots have been rewritten.
 * @throws {ImportLockHeldError} When another extension page is importing.
 * @throws {Error} When the rewrite fails or drops nodes.
 */
export function restoreSafetySnapshot(snapshot: SafetySnapshot): Promise<void> {
  return withImportLock(() => restoreSafetySnapshotUnlocked(snapshot))
}

async function restoreSafetySnapshotUnlocked(
  snapshot: SafetySnapshot,
): Promise<void> {
  const taken = await takeSafetySnapshot()
  let hasClearedExisting = false
  try {
    const isComplete = await hasRewrittenRootsFully(snapshot.roots, () => {
      hasClearedExisting = true
    })
    if (!isComplete) throw new Error(i18n.t('safetySnapshotIncomplete'))
  } catch (error) {
    if (hasClearedExisting) await recoverFromSnapshot(taken, error)
    throw error
  }
}

async function recoverFromSnapshot(
  taken: SafetySnapshot,
  originalError: unknown,
): Promise<void> {
  try {
    if (await hasRewrittenRootsFully(taken.roots)) {
      markImportRestored(originalError)
    }
  } catch (recoveryError) {
    console.error('Safety snapshot recovery failed', recoveryError)
  }
}
