import type { AutoExportConfig, AutoExportLastRun } from '@/lib/types'

export type PopupStatus =
  { kind: 'failed' } | { kind: 'next-run'; nextRun: number } | { kind: 'off' }

interface PopupStatusInput {
  config: AutoExportConfig
  nextRun: number | null
  lastRun: AutoExportLastRun | null
}

/**
 * Decides which auto-export state the popup status item shows. A failed last
 * run takes priority over a scheduled next run; auto-export counts as off
 * when disabled or when nothing is scheduled.
 * @param input The stored config, next due time and normalized last run.
 * @returns The status variant to render.
 */
export function resolvePopupStatus(input: PopupStatusInput): PopupStatus {
  const { config, nextRun, lastRun } = input
  if (lastRun !== null && !lastRun.ok) return { kind: 'failed' }
  return nextRun !== null && config.enabled
    ? { kind: 'next-run', nextRun }
    : { kind: 'off' }
}
