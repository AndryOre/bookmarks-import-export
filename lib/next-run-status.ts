export type NextRunStatus =
  | { kind: 'off' }
  | { kind: 'scheduling' }
  | { kind: 'scheduled'; nextRun: number }

/**
 * Decides what the auto-export status card shows as the next run. Enabled
 * with no stored next run is the short gap right after enabling, so it reads
 * as scheduling rather than as a never-run state.
 * @param isEnabled Whether auto-export is enabled.
 * @param nextRun The stored next due time, or null when none is stored.
 * @returns The status variant to render.
 */
export function resolveNextRunStatus(
  isEnabled: boolean,
  nextRun: number | null,
): NextRunStatus {
  if (!isEnabled) return { kind: 'off' }
  return nextRun === null
    ? { kind: 'scheduling' }
    : { kind: 'scheduled', nextRun }
}
