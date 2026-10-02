import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { APP_ROUTES } from './app-url'
import { getLegacyRedirectUrl } from './legacy-redirect'

const appUrl = () => fakeBrowser.runtime.getURL('/app.html')

beforeEach(() => {
  fakeBrowser.reset()
})

describe('getLegacyRedirectUrl', () => {
  it.each([
    [APP_ROUTES.export, '#/export'],
    [APP_ROUTES.import, '#/import'],
    [APP_ROUTES.welcome, '#/welcome'],
    [APP_ROUTES.whatsNew, '#/whats-new'],
  ])('sends %s to its App route', (route, hash) => {
    expect(getLegacyRedirectUrl(route, '')).toBe(`${appUrl()}${hash}`)
  })

  it('maps the v1 auto-export deep link to the Auto-export route', () => {
    expect(
      getLegacyRedirectUrl(APP_ROUTES.export, '?settings=auto-export'),
    ).toBe(`${appUrl()}#/auto-export`)
  })

  it('ignores other settings values', () => {
    expect(getLegacyRedirectUrl(APP_ROUTES.export, '?settings=other')).toBe(
      `${appUrl()}#/export`,
    )
  })
})
