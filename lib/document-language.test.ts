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

  it.each([
    ['de-AT', 'de'],
    ['pt-BR', 'pt-BR'],
    ['zh-CN', 'zh-CN'],
    ['pl', 'en'],
    ['pt-PT', 'en'],
    ['zh-TW', 'en'],
  ])('resolves UI language %s to %s', (language, expected) => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue(language)

    applyDocumentLanguage()

    expect(document.documentElement.lang).toBe(expected)
  })

  it('keeps the current lang when the UI language is empty', () => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('')

    applyDocumentLanguage()

    expect(document.documentElement.lang).toBe('en')
  })
})
