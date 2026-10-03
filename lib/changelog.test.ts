import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { APP_ROUTES, getAppUrl } from './app-url'
import { formatChangelogDate, getChangelog } from './changelog'

beforeEach(() => {
  fakeBrowser.reset()
})

function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (const [index, part] of left.entries()) {
    const difference = part - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

describe('getChangelog', () => {
  it('returns entries newest release first', () => {
    const entries = getChangelog()

    const versions = entries.map((entry) => entry.version)
    expect(versions[0]).toBe('2.0.0')
    expect(versions.at(-1)).toBe('0.1.0')
    expect(versions).toEqual(
      versions.toSorted((a, b) => compareVersions(a, b)).toReversed(),
    )
  })

  it('compares versions numerically so 1.10.0 is newer than 1.9.0', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0)
  })

  it('points every linkUrl at an App route built from the app-URL helper', () => {
    const entries = getChangelog()
    const linkFor = (version: string) =>
      entries.find((entry) => entry.version === version)?.items[0]?.linkUrl

    expect(
      getChangelog()
        .find((entry) => entry.version === '2.0.0')
        ?.items.find((item) => item.linkUrl)?.linkUrl,
    ).toBe(getAppUrl(APP_ROUTES.export))
    expect(linkFor('1.7.0')).toBe(getAppUrl(APP_ROUTES.autoExport))
    expect(linkFor('1.6.0')).toBe(getAppUrl(APP_ROUTES.autoExport))
    expect(linkFor('1.5.0')).toBe(getAppUrl(APP_ROUTES.import))
    expect(linkFor('1.0.0')).toBe(getAppUrl(APP_ROUTES.export))
    expect(linkFor('1.7.0')).toBe(
      fakeBrowser.runtime.getURL('/app.html') + '#/auto-export',
    )
  })

  it('never links to the legacy standalone pages', () => {
    const urls = getChangelog().flatMap((entry) =>
      entry.items.map((item) => item.linkUrl ?? ''),
    )

    expect(urls.some((url) => url.includes('advanced-'))).toBe(false)
  })

  it('leaves linkKey/linkUrl unset for items without a link', () => {
    const entries = getChangelog()

    const entry = entries.find((entry) => entry.version === '1.4.0')
    expect(entry?.items[0]?.linkKey).toBeUndefined()
    expect(entry?.items[0]?.linkUrl).toBeUndefined()
  })
})

describe('2.0.0 entry', () => {
  it('covers every headline feature, linking duplicates to its page', () => {
    const entry = getChangelog().find((item) => item.version === '2.0.0')

    expect(entry?.items.map((item) => item.textKey)).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((index) => `changelog_2_0_0_${index}`),
    )
    expect(entry?.items[4]?.linkUrl).toBe(getAppUrl(APP_ROUTES.duplicates))
    expect(entry?.items[5]?.linkUrl).toBe(getAppUrl(APP_ROUTES.autoExport))
  })
})

describe('changelog dates', () => {
  it('stores every release date as a valid ISO date', () => {
    for (const { isoDate } of getChangelog()) {
      expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(`${isoDate}T00:00:00Z`).getTime())).toBe(
        false,
      )
    }
  })

  it('formats the date in the requested locale', () => {
    expect(formatChangelogDate('2026-10-02', 'en')).toBe('October 2, 2026')
    expect(formatChangelogDate('2026-10-02', 'es')).toBe('2 de octubre de 2026')
  })

  it('does not shift the day with the process timezone', () => {
    expect(formatChangelogDate('2025-02-13', 'en')).toBe('February 13, 2025')
  })
})
