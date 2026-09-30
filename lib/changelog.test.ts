import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { getChangelog } from './changelog'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('getChangelog', () => {
  it('returns entries newest release first', () => {
    const entries = getChangelog()

    const versions = entries.map((entry) => entry.version)
    expect(versions[0]).toBe('1.7.0')
    expect(versions.at(-1)).toBe('0.1.0')
    expect(versions).toEqual(
      versions.toSorted((a, b) => a.localeCompare(b)).toReversed(),
    )
  })

  it('points linkUrl at extension-internal pages built from browser.runtime.getURL', () => {
    const entries = getChangelog()

    const advancedExportEntry = entries.find(
      (entry) => entry.version === '1.6.0',
    )
    expect(advancedExportEntry?.items[0]?.linkUrl).toBe(
      `${fakeBrowser.runtime.getURL('/advanced-export.html')}?settings=auto-export`,
    )

    const advancedImportEntry = entries.find(
      (entry) => entry.version === '1.5.0',
    )
    expect(advancedImportEntry?.items[0]?.linkUrl).toBe(
      fakeBrowser.runtime.getURL('/advanced-import.html'),
    )
  })

  it('leaves linkKey/linkUrl unset for items without a link', () => {
    const entries = getChangelog()

    const entry = entries.find((entry) => entry.version === '1.4.0')
    expect(entry?.items[0]?.linkKey).toBeUndefined()
    expect(entry?.items[0]?.linkUrl).toBeUndefined()
  })
})
