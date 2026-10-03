// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { applyDocumentLanguage } from './document-language'

describe('applyDocumentLanguage', () => {
  afterEach(() => {
    document.documentElement.lang = 'en'
    vi.restoreAllMocks()
  })

  it.each(['ja', 'ko', 'zh-CN', 'ru'])('sets lang to %s', (language) => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue(language)

    applyDocumentLanguage()

    expect(document.documentElement.lang).toBe(language)
  })

  it('keeps the current lang when the UI language is empty', () => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('')

    applyDocumentLanguage()

    expect(document.documentElement.lang).toBe('en')
  })
})
