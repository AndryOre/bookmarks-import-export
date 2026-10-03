import { i18n } from '#i18n'

/**
 * Name of the Web Lock that serializes destructive bookmark imports across
 * every extension page (App tabs, popup). Request it with
 * `navigator.locks.request(IMPORT_LOCK_NAME, { ifAvailable: true }, …)` so a
 * second import fails fast instead of queueing behind the first.
 */
export const IMPORT_LOCK_NAME = 'snug-import'

/**
 * Thrown when another extension page already holds {@link IMPORT_LOCK_NAME}.
 */
export class ImportLockHeldError extends Error {
  constructor() {
    super(i18n.t('importAnotherRunning'))
    this.name = 'ImportLockHeldError'
  }
}

/**
 * Runs `task` while holding {@link IMPORT_LOCK_NAME}.
 * @param task The work to run exclusively.
 * @returns Whatever `task` resolves to.
 * @throws {ImportLockHeldError} When another context already holds the lock;
 *   `task` is not run.
 */
export async function withImportLock<Value>(
  task: () => Promise<Value>,
): Promise<Value> {
  const outcome = await navigator.locks.request(
    IMPORT_LOCK_NAME,
    { ifAvailable: true },
    async (lock) => (lock === null ? null : { value: await task() }),
  )
  if (outcome === null) throw new ImportLockHeldError()
  return outcome.value
}
