import type { Browser } from '@wxt-dev/browser'

/**
 * A progress event emitted while an import writes bookmarks. `done` and
 * `total` count bookmarks (not folders); `skippedDuplicates` is how many were
 * left out by Skip duplicates before writing began.
 */
export interface ImportProgress {
  done: number
  total: number
  skippedDuplicates: number
}

/**
 * Lets a caller observe and cancel an import: `onProgress` fires after every
 * batch of created bookmarks and once more when writing ends, and aborting
 * `signal` rolls the browser back to its previous state.
 */
export interface ImportControl {
  onProgress?: (progress: ImportProgress) => void
  signal?: AbortSignal
  onClearingExisting?: () => void
}

/**
 * Number of bookmarks created between two progress events.
 */
export const IMPORT_PROGRESS_BATCH_SIZE = 25

/**
 * Thrown by an importer after a cancel has been rolled back. When
 * `hasClearedExisting` is true, Restore-replace had already deleted the
 * existing bookmarks, so the caller must restore the Safety snapshot.
 */
export class ImportCanceledError extends Error {
  readonly hasClearedExisting: boolean

  constructor(hasClearedExisting: boolean) {
    super('Import canceled')
    this.name = 'ImportCanceledError'
    this.hasClearedExisting = hasClearedExisting
  }
}

const restoredErrors = new WeakSet<object>()

/**
 * Records that the Safety snapshot was restored after `error` aborted an
 * import, so the UI can tell the user their bookmarks are back.
 * @param error The error that aborted the import.
 */
export function markImportRestored(error: unknown): void {
  if (typeof error === 'object' && error !== null) restoredErrors.add(error)
}

/**
 * Whether the Safety snapshot was restored after `error` aborted an import.
 * @param error Any caught value.
 * @returns True when {@link markImportRestored} was called for it.
 */
export function wasImportRestored(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && restoredErrors.has(error)
  )
}

/**
 * Creates bookmark nodes for one import while journaling every node it made,
 * so a cancel can remove exactly those nodes. It checks the abort signal
 * before each creation and reports progress per batch.
 */
export class ImportWriter {
  private done = 0
  private hasClearedExisting = false
  private readonly createdIds = new Set<string>()
  private readonly topLevelIds: string[] = []

  private readonly control: ImportControl
  private readonly total: number
  private readonly skippedDuplicates: number

  constructor(
    control: ImportControl,
    total: number,
    skippedDuplicates: number,
  ) {
    this.control = control
    this.total = total
    this.skippedDuplicates = skippedDuplicates
  }

  private emitProgress(): void {
    this.control.onProgress?.({
      done: this.done,
      total: this.total,
      skippedDuplicates: this.skippedDuplicates,
    })
  }

  /**
   * Creates one node, journals it, and emits progress when a batch fills up.
   * @param details The `browser.bookmarks.create` details.
   * @returns The created node.
   * @throws {ImportCanceledError} When the signal is already aborted; nothing
   *   is created.
   */
  async create(
    details: Browser.bookmarks.CreateDetails,
  ): Promise<Browser.bookmarks.BookmarkTreeNode> {
    this.throwIfAborted()
    const node = await browser.bookmarks.create(details)
    this.createdIds.add(node.id)
    if (!details.parentId || !this.createdIds.has(details.parentId)) {
      this.topLevelIds.push(node.id)
    }
    if (details.url !== undefined) {
      this.done++
      if (this.done % IMPORT_PROGRESS_BATCH_SIZE === 0) this.emitProgress()
    }
    return node
  }

  /**
   * Records that Restore-replace is about to delete existing bookmarks, so a
   * later cancel reports that the snapshot must be restored.
   * @throws {ImportCanceledError} When the signal is already aborted.
   */
  markClearingExisting(): void {
    this.throwIfAborted()
    this.hasClearedExisting = true
    this.control.onClearingExisting?.()
  }

  /**
   * Checks the signal between steps that do not create a node.
   * @throws {ImportCanceledError} When the signal is aborted.
   */
  throwIfAborted(): void {
    if (this.control.signal?.aborted) {
      throw new ImportCanceledError(this.hasClearedExisting)
    }
  }

  /**
   * Emits the closing progress event once writing has finished.
   */
  finish(): void {
    this.emitProgress()
  }

  /**
   * Removes every node this writer created. Keeps going past a failed removal
   * and rethrows the first failure at the end.
   * @returns Resolves once the created nodes are gone.
   */
  async rollback(): Promise<void> {
    let firstError: unknown
    for (const id of this.topLevelIds.toReversed()) {
      try {
        await browser.bookmarks.removeTree(id)
      } catch (error) {
        firstError ??= error
      }
    }
    this.topLevelIds.length = 0
    this.createdIds.clear()
    if (firstError) throw firstError
  }
}

/**
 * Runs an import step and, when it fails or is canceled, rolls back everything
 * the writer created before rethrowing the original error.
 * @param writer The writer journaling the step.
 * @param step The writing work.
 * @returns The step's result.
 * @throws {Error} The step's original error after a rollback attempt; a failing rollback is logged and does not replace it.
 */
export async function withImportRollback<T>(
  writer: ImportWriter,
  step: () => Promise<T>,
): Promise<T> {
  try {
    return await step()
  } catch (error) {
    try {
      await writer.rollback()
    } catch (rollbackError) {
      console.error('Import rollback failed', rollbackError)
    }
    throw error
  }
}
