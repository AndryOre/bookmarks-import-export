import { describe, expect, it } from 'vitest'

import { runImport } from './run-import'

describe('runImport', () => {
  it('rejects content whose format cannot be detected', async () => {
    await expect(
      runImport('not a bookmarks file', 'text/plain', 'folder'),
    ).rejects.toThrow()
  })
})
