import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  acquireLock,
  didAcquireLock,
  type LockHolder,
  releaseLock,
} from './locks'

/**
 * A pid that is guaranteed to belong to an already-exited process, obtained
 * by synchronously spawning and waiting on a trivial child process.
 */
function deadPid(): number {
  const child = spawnSync(process.execPath, ['-e', '0'])
  if (child.pid === undefined) {
    throw new Error(
      'locks.test: failed to spawn a child process to obtain a dead pid',
    )
  }
  return child.pid
}

describe('acquireLock / releaseLock', () => {
  let workingDirectory: string
  let lockDirectory: string

  beforeEach(() => {
    workingDirectory = mkdtempSync(path.join(tmpdir(), 'locks-test-'))
    lockDirectory = path.join(workingDirectory, 'some.lock')
  })

  afterEach(() => {
    rmSync(workingDirectory, { recursive: true, force: true })
  })

  function buildHolder(overrides: Partial<LockHolder> = {}): LockHolder {
    return {
      pid: process.pid,
      worktree: workingDirectory,
      acquiredAt: Date.now(),
      ...overrides,
    }
  }

  it('acquires the lock and writes the holder payload', async () => {
    const holder = buildHolder()

    await acquireLock(lockDirectory, () => holder, {
      timeoutMs: 1000,
      pollIntervalMs: 10,
      maxAgeMs: 60_000,
      logLabel: 'test',
    })

    expect(existsSync(lockDirectory)).toBe(true)
    const written = JSON.parse(
      readFileSync(path.join(lockDirectory, 'holder.json'), 'utf8'),
    ) as LockHolder
    expect(written).toEqual(holder)
  })

  it('blocks a second acquire from a different holder while the first is live', async () => {
    const firstHolder = buildHolder({ pid: process.pid })
    expect(didAcquireLock(lockDirectory, firstHolder)).toBe(true)

    const secondHolder = buildHolder({
      pid: process.pid,
      worktree: `${workingDirectory}-other`,
    })

    /**
     * `timeoutMs: 0` fails on the first deadline check, right after the
     * blocked `didAcquireLock`/`isLockStale` checks — this repo's vitest
     * workers don't expose the `Bun` global that {@link acquireLock}'s poll
     * delay (`Bun.sleep`) needs, so the test must never reach that branch.
     */
    await expect(
      acquireLock(lockDirectory, () => secondHolder, {
        timeoutMs: 0,
        pollIntervalMs: 10,
        maxAgeMs: 60_000,
        logLabel: 'test',
      }),
    ).rejects.toThrow(/timed out/)
  })

  it('reclaims a stale lock left by a dead pid', async () => {
    /**
     * Simulates a pre-existing lock directory left behind by a killed
     * process.
     */
    const staleHolder = buildHolder({
      pid: deadPid(),
      worktree: path.join(workingDirectory, 'nonexistent-worktree'),
      acquiredAt: Date.now(),
    })
    mkdirSync(lockDirectory)
    writeFileSync(
      path.join(lockDirectory, 'holder.json'),
      JSON.stringify(staleHolder),
    )

    const newHolder = buildHolder()
    await acquireLock(lockDirectory, () => newHolder, {
      timeoutMs: 1000,
      pollIntervalMs: 10,
      maxAgeMs: 60_000,
      logLabel: 'test',
    })

    const written = JSON.parse(
      readFileSync(path.join(lockDirectory, 'holder.json'), 'utf8'),
    ) as LockHolder
    expect(written).toEqual(newHolder)
  })

  it('cleans up the lock directory on release', () => {
    const holder = buildHolder()
    expect(didAcquireLock(lockDirectory, holder)).toBe(true)
    expect(existsSync(lockDirectory)).toBe(true)

    releaseLock(lockDirectory)

    expect(existsSync(lockDirectory)).toBe(false)
  })
})
