// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { resetFakeI18n } from '@/lib/testing/fake-i18n'

import { getFaviconBase64, getFaviconUrl } from './favicon'

/**
 * Chrome's generic globe placeholder icon, copied verbatim from the
 * `DEFAULT_CHROME_FAVICON` constant in `lib/favicon.ts` (the string
 * `getFaviconBase64` compares its `FileReader` result against to detect "no
 * real favicon"). Used with a stubbed `FileReader` below, rather than a real
 * `Blob`/`FileReader` round-trip, since that literal isn't valid padded
 * base64 (its length isn't a multiple of 4) and a real `FileReader` always
 * emits correctly padded output.
 */
const DEFAULT_CHROME_FAVICON =
  'data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAAEAAAABAAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArwCvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

/**
 * A minimal `FileReader` stand-in that ignores the blob it's given and
 * synchronously "resolves" to a fixed `result`, so `getFaviconBase64` tests
 * can control exactly what the real `FileReader` would have read without
 * needing to build a `Blob` whose bytes encode to a specific base64 string.
 */
class StubFileReader {
  private readonly listeners = new Map<string, (() => void)[]>()

  result: string | null = null

  addEventListener(type: string, callback: () => void): void {
    const existing = this.listeners.get(type) ?? []
    existing.push(callback)
    this.listeners.set(type, existing)
  }

  readAsDataURL(): void {
    queueMicrotask(() => {
      const callbacks = this.listeners.get('loadend') ?? []
      for (const callback of callbacks) callback()
    })
  }
}

function stubFileReaderResult(value: string): void {
  vi.stubGlobal(
    'FileReader',
    class extends StubFileReader {
      override result = value
    },
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
  it('builds a _favicon URL with the page URL and default size 16', () => {
    const url = getFaviconUrl('https://example.com/')

    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/_favicon/')
    expect(parsed.searchParams.get('pageUrl')).toBe('https://example.com/')
    expect(parsed.searchParams.get('size')).toBe('16')
  })

  it('honors a custom size', () => {
    const url = getFaviconUrl('https://example.com/', 32)

    expect(new URL(url).searchParams.get('size')).toBe('32')
  })
})

describe('getFaviconBase64', () => {
  it('resolves the favicon as a base64 data URL', async () => {
    const blob = new Blob(['test'], { type: 'image/png' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) }),
    )

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('data:image/png;base64,dGVzdA==')
  })

  it('resolves to an empty string when the API falls back to the default Chrome placeholder', async () => {
    stubFileReaderResult(DEFAULT_CHROME_FAVICON)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['irrelevant'])),
      }),
    )

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('')
  })

  it('resolves to an empty string and logs when fetching fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('network error')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('')
    expect(consoleError).toHaveBeenCalledWith('Error fetching favicon', error)
  })

  it('resolves to an empty string and logs when the FileReader errors', async () => {
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['x'])),
      }),
    )

    const result = await getFaviconBase64('https://example.com/')

    expect(result).toBe('')
    expect(consoleError).toHaveBeenCalledWith(
      'Error fetching favicon',
      readError,
    )
  })
})
