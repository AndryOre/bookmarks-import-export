import { describe, expect, it } from 'vitest'

import { resolvePopupStatus } from '@/lib/popup-status'
import type { AutoExportConfig, AutoExportLastRun } from '@/lib/types'

const enabledConfig: AutoExportConfig = {
  enabled: true,
  interval: '1d',
  preferredTime: '00:00',
  dayOfWeek: 1,
  path: 'bookmarks-backup/',
  formats: ['html'],
  keepLast: 10,
}

const failedRun: AutoExportLastRun = {
  at: 1000,
  ok: false,
  error: 'Download failed',
  trigger: 'scheduled',
}

describe('resolvePopupStatus', () => {
  it('reports off when auto-export is disabled', () => {
    expect(
      resolvePopupStatus({
        config: { ...enabledConfig, enabled: false },
        nextRun: null,
        lastRun: null,
      }),
    ).toEqual({ kind: 'off' })
  })

  it('reports the next run when enabled and scheduled', () => {
    expect(
      resolvePopupStatus({
        config: enabledConfig,
        nextRun: 5000,
        lastRun: null,
      }),
    ).toEqual({ kind: 'next-run', nextRun: 5000 })
  })

  it('reports off when enabled but nothing is scheduled', () => {
    expect(
      resolvePopupStatus({
        config: enabledConfig,
        nextRun: null,
        lastRun: null,
      }),
    ).toEqual({ kind: 'off' })
  })

  it('prioritizes a failed last run over the next run', () => {
    expect(
      resolvePopupStatus({
        config: enabledConfig,
        nextRun: 5000,
        lastRun: failedRun,
      }),
    ).toEqual({ kind: 'failed' })
  })

  it('ignores a successful last run', () => {
    expect(
      resolvePopupStatus({
        config: enabledConfig,
        nextRun: 5000,
        lastRun: { at: 1, ok: true, trigger: 'manual' },
      }),
    ).toEqual({ kind: 'next-run', nextRun: 5000 })
  })
})
