import { describe, expect, it } from 'vitest'

import { createLatestOnly } from './latest-only'

function deferred<T>() {
  return Promise.withResolvers<T>()
}

describe('createLatestOnly', () => {
  it('returns the value when nothing supersedes the call', async () => {
    const run = createLatestOnly(async (input: string) => input.toUpperCase())
    await expect(run('a')).resolves.toEqual({ isCurrent: true, value: 'A' })
  })

  it('marks the earlier call stale when it resolves after a later one', async () => {
    const pending = new Map([
      ['A', deferred<string>()],
      ['B', deferred<string>()],
    ])
    const run = createLatestOnly((input: string) => pending.get(input)!.promise)

    const first = run('A')
    const second = run('B')
    pending.get('B')!.resolve('preview-B')
    pending.get('A')!.resolve('preview-A')

    await expect(second).resolves.toEqual({
      isCurrent: true,
      value: 'preview-B',
    })
    await expect(first).resolves.toEqual({ isCurrent: false })
  })

  it('swallows the error of a superseded call but surfaces the current one', async () => {
    const pending = [deferred<string>(), deferred<string>()]
    let call = 0
    const run = createLatestOnly(() => pending[call++]!.promise)

    const first = run('A')
    const second = run('B')
    pending[0]!.reject(new Error('stale failure'))
    pending[1]!.reject(new Error('current failure'))

    await expect(first).resolves.toEqual({ isCurrent: false })
    await expect(second).rejects.toThrow('current failure')
  })
})
