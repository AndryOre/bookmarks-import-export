import { i18n } from '#i18n'
import { storage } from '#imports'

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
 * but the importer skips them on restore.
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

  return {
    takenAt: Date.now(),
    roots: [
      { ...toParsedBookmark(barNode), id: '1' },
      { ...toParsedBookmark(otherNode), id: '2' },
      ...(mobileNode ? [{ ...toParsedBookmark(mobileNode), id: '3' }] : []),
    ],
  }
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
 * Restores a snapshot into the bookmarks bar, other bookmarks and, when the
 * snapshot has it, Mobile, replacing their current content. URLs are written
 * as-is, so bookmarklets and `chrome://` bookmarks survive. This is itself a Restore-replace, so a new Safety
 * snapshot of the current state is taken first, and nothing is deleted if that
 * fails.
 * @param snapshot The snapshot to restore.
 * @returns Resolves once the roots have been rewritten.
 */
export async function restoreSafetySnapshot(
  snapshot: SafetySnapshot,
): Promise<void> {
  await takeSafetySnapshot()
  await importFromJSON(structuredClone(snapshot.roots), 'restore-replace', {
    trusted: true,
  })
}
