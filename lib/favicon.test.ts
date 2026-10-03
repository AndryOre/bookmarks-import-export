// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { resetFakeI18n } from '@/lib/testing/fake-i18n'

async function loadFavicon() {
  vi.resetModules()
  return import('./favicon')
}

const placeholderBlob = new Blob(['placeholder-globe'], { type: 'image/png' })
const realBlob = new Blob(['real-icon'], { type: 'image/png' })
const realDataUrl = 'data:image/png;base64,cmVhbC1pY29u'

/**
 * Stubs `fetch` so each `_favicon` request is answered by looking at its
 * `pageUrl`: return a `Blob` to resolve with it, or an `Error` to reject.
 * @param responseByPageUrl Picks the outcome for a given `pageUrl`.
 */
function stubFaviconResponses(
  responseByPageUrl: (pageUrl: string) => Blob | Error,
): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const pageUrl = new URL(input).searchParams.get('pageUrl') as string
      const outcome = responseByPageUrl(pageUrl)
      return outcome instanceof Error
        ? Promise.reject(outcome)
        : Promise.resolve({ blob: () => Promise.resolve(outcome) })
    }),
  )
}

beforeEach(() => {
  fakeBrowser.reset()
  resetFakeI18n()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getFaviconUrl', () => {
  it('builds a _favicon URL with the page URL and default size 16', async () => {
    const { getFaviconUrl } = await loadFavicon()
    const url = getFaviconUrl('https://example.com/')

    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/_favicon/')
    expect(parsed.searchParams.get('pageUrl')).toBe('https://example.com/')
    expect(parsed.searchParams.get('size')).toBe('16')
  })

  it('honors a custom size', async () => {
    const { getFaviconUrl } = await loadFavicon()
    const url = getFaviconUrl('https://example.com/', 32)

    expect(new URL(url).searchParams.get('size')).toBe('32')
  })
})

describe('getFaviconBase64', () => {
  it('resolves the favicon as a base64 data URL', async () => {
    const { getFaviconBase64 } = await loadFavicon()
    stubFaviconResponses((pageUrl) =>
      pageUrl === 'https://example.com/' ? realBlob : placeholderBlob,
    )

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe(realDataUrl)
  })

  it('resolves to an empty string when the icon equals the runtime-fetched placeholder', async () => {
    const { getFaviconBase64 } = await loadFavicon()
    stubFaviconResponses(() => placeholderBlob)

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('')
  })

  it('memoizes the placeholder lookup per size', async () => {
    const { getFaviconBase64 } = await loadFavicon()
    stubFaviconResponses((pageUrl) =>
      pageUrl === 'https://example.com/' ? realBlob : placeholderBlob,
    )

    await getFaviconBase64('https://example.com/')
    await getFaviconBase64('https://example.com/')
    await getFaviconBase64('https://example.com/', 32)

    const placeholderCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([input]) => String(input).includes('snug.invalid'))
    expect(placeholderCalls).toHaveLength(2)
  })

  it('returns the icon when the placeholder lookup fails', async () => {
    const { getFaviconBase64 } = await loadFavicon()
    stubFaviconResponses((pageUrl) =>
      pageUrl === 'https://example.com/'
        ? realBlob
        : new Error('placeholder lookup failed'),
    )

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe(realDataUrl)
  })

  it('resolves to an empty string and logs when fetching fails', async () => {
    const { getFaviconBase64 } = await loadFavicon()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('network error')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('')
    expect(consoleError).toHaveBeenCalledWith('Error fetching favicon', error)
  })

  it('resolves to an empty string and logs when the FileReader errors', async () => {
    const { getFaviconBase64 } = await loadFavicon()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const readError = new Error('read failed')
    vi.stubGlobal(
      'FileReader',
      class {
        private onError: (() => void) | undefined
        error = readError
        addEventListener(type: string, callback: () => void): void {
          if (type === 'error') this.onError = callback
        }
        readAsDataURL(): void {
          queueMicrotask(() => this.onError?.())
        }
      },
    )
    stubFaviconResponses(() => new Blob(['x']))

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('')
    expect(consoleError).toHaveBeenCalledWith(
      'Error fetching favicon',
      readError,
    )
  })
})
