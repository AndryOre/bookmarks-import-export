import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { APP_ROUTES, getAppUrl } from './app-url'
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

  it('points every linkUrl at an App route built from the app-URL helper', () => {
    const entries = getChangelog()
    const linkFor = (version: string) =>
      entries.find((entry) => entry.version === version)?.items[0]?.linkUrl

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
