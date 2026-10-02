import { describe, expect, it } from 'vitest'

import {
  CHROME_WEB_STORE_EXTENSION_ID,
  CHROME_WEB_STORE_URL,
  GITHUB_URL,
  PRODUCT_NAME,
  TWITTER_URL,
} from './brand'

const localeMessages = import.meta.glob<{
  extensionName: { message: string }
}>('../locales/*.json', { eager: true, import: 'default' })

describe('PRODUCT_NAME', () => {
  it('finds the locale files', () => {
    expect(Object.keys(localeMessages).length).toBeGreaterThanOrEqual(2)
  })

  it.each(Object.entries(localeMessages))(
    'equals extensionName in %s',
    (_path, messages) => {
      expect(messages.extensionName.message).toBe(PRODUCT_NAME)
    },
  )
})

describe('CHROME_WEB_STORE_URL', () => {
  it('contains the extension ID', () => {
    expect(CHROME_WEB_STORE_URL).toContain(CHROME_WEB_STORE_EXTENSION_ID)
  })

  it('does not contain the store slug, so a listing rename cannot break it', () => {
    expect(CHROME_WEB_STORE_URL).not.toContain('bookmark-importexport')
  })

  it('is the slugless detail URL form', () => {
    expect(CHROME_WEB_STORE_URL).toBe(
      `https://chromewebstore.google.com/detail/${CHROME_WEB_STORE_EXTENSION_ID}`,
    )
  })
})

describe('GITHUB_URL', () => {
  it('points at the project repository', () => {
    expect(GITHUB_URL).toBe('https://github.com/AndryOre/snug')
  })
})

describe('TWITTER_URL', () => {
  it('points at the project X profile', () => {
    expect(TWITTER_URL).toBe('https://x.com/andryore')
  })
})
