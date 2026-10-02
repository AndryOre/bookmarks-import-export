import { describe, expect, it } from 'vitest'

import { isAllowedBookmarkUrl } from './url-validation'

describe('isAllowedBookmarkUrl', () => {
  it.each([
    // eslint-disable-next-line unicorn/prefer-https -- the plain http scheme is exactly what is under test
    'http://example.com',
    'https://example.com/path?q=1#hash',
    'ftp://files.example.com/pub',
    'HTTPS://EXAMPLE.COM',
  ])('allows %s', (url) => {
    expect(isAllowedBookmarkUrl(url)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'chrome://settings',
    'chrome-extension://abc/page.html',
    'about:blank',
    'mailto:someone@example.com',
    'vbscript:msgbox(1)',
  ])('rejects the unsafe scheme in %s', (url) => {
    expect(isAllowedBookmarkUrl(url)).toBe(false)
  })

  it.each([undefined, '', 'not a url', 'example.com', '//example.com'])(
    'rejects missing or unparseable input %j',
    (url) => {
      expect(isAllowedBookmarkUrl(url)).toBe(false)
    },
  )
})
