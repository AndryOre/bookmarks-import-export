import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { getAppUrl } from './app-url'

beforeEach(() => {
  fakeBrowser.reset()
})

describe('getAppUrl', () => {
  it('points at the App page with no route by default', () => {
    expect(getAppUrl()).toBe(`${fakeBrowser.runtime.getURL('/app.html')}#/`)
  })

  it('appends a hash route', () => {
    expect(getAppUrl('/auto-export')).toBe(
      `${fakeBrowser.runtime.getURL('/app.html')}#/auto-export`,
    )
  })

  it('normalizes a route missing its leading slash', () => {
    expect(getAppUrl('whats-new')).toBe(
      `${fakeBrowser.runtime.getURL('/app.html')}#/whats-new`,
    )
  })
})
