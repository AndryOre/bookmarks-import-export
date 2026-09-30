import { describe, expect, it } from 'vitest'

import { detectFormat } from './detect-format'

describe('detectFormat', () => {
  it('detects valid JSON content', () => {
    expect(detectFormat('{"a":1}', 'application/json')).toBe('json')
  })

  it('rejects invalid JSON content', () => {
    expect(detectFormat('{not json', 'application/json')).toBe('unknown')
  })

  it('detects valid Netscape bookmark HTML', () => {
    expect(
      detectFormat(
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><p></DL><p>',
        'text/html',
      ),
    ).toBe('html')
  })

  it('rejects HTML without the Netscape doctype', () => {
    expect(detectFormat('<html></html>', 'text/html')).toBe('unknown')
  })

  it('detects valid CSV with title and url headers', () => {
    expect(
      detectFormat('title,url\nExample,https://example.com', 'text/csv'),
    ).toBe('csv')
  })

  it('rejects CSV missing title/url headers', () => {
    expect(detectFormat('foo,bar\n1,2', 'text/csv')).toBe('unknown')
  })

  it('returns unknown for unsupported mime types', () => {
    expect(detectFormat('anything', 'application/xml')).toBe('unknown')
  })

  it('is case-insensitive on mime type', () => {
    expect(detectFormat('{"a":1}', 'APPLICATION/JSON')).toBe('json')
  })
})
