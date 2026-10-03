import { describe, expect, it } from 'vitest'

import { resolveNextRunStatus } from './next-run-status'

describe('resolveNextRunStatus', () => {
  it('is off when auto-export is disabled', () => {
    expect(resolveNextRunStatus(false, 5000)).toEqual({ kind: 'off' })
    expect(resolveNextRunStatus(false, null)).toEqual({ kind: 'off' })
  })

  it('is scheduling when enabled without a stored next run', () => {
    expect(resolveNextRunStatus(true, null)).toEqual({ kind: 'scheduling' })
  })

  it('carries the stored next run when enabled', () => {
    expect(resolveNextRunStatus(true, 5000)).toEqual({
      kind: 'scheduled',
      nextRun: 5000,
    })
  })
})
