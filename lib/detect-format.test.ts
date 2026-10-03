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

  it('detects a lowercase Netscape doctype', () => {
    expect(
      detectFormat(
        '<!doctype netscape-bookmark-file-1>\n<DL><p></DL><p>',
        'text/html',
      ),
    ).toBe('html')
  })

  it('does not treat a non-Safari top-level Favorites folder as Safari', () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Tech</H3>
<DL><p><DT><A HREF="https://x.example">X</A></DL><p>
<DT><H3>Favorites</H3>
<DL><p><DT><A HREF="https://a.example">A</A></DL><p>
</DL><p>`
    expect(detectFormat(html, 'text/html')).toBe('html')
  })

  it('detects Safari by a leading Favorites or a Reading List folder', () => {
    const favoritesFirst = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Favorites</H3>
<DL><p><DT><A HREF="https://a.example">A</A></DL><p>
</DL><p>`
    const readingList = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Misc</H3><DL><p></DL><p>
<DT><H3>Reading List</H3>
<DL><p><DT><A HREF="https://a.example">A</A></DL><p>
</DL><p>`
    expect(detectFormat(favoritesFirst, 'text/html')).toBe('safari')
    expect(detectFormat(readingList, 'text/html')).toBe('safari')
  })

  it('rejects HTML without the Netscape doctype', () => {
    expect(detectFormat('<html></html>', 'text/html')).toBe('unknown')
  })

  it('rejects CSV headers that only contain title and url as substrings', () => {
    expect(
      detectFormat('Page Title,Page URL\nX,https://example.com', 'text/csv'),
    ).toBe('unknown')
  })

  it('detects CSV headers regardless of case and padding', () => {
    expect(
      detectFormat(' Title , URL \nX,https://example.com', 'text/csv'),
    ).toBe('csv')
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

  describe('fallbacks', () => {
    const csv = 'title,url\nExample,https://example.com'
    const html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><p></DL><p>'

    it('detects a CSV reported as application/vnd.ms-excel', () => {
      expect(detectFormat(csv, 'application/vnd.ms-excel', 'export.csv')).toBe(
        'csv',
      )
    })

    it.each([
      ['{"a":1}', 'a.json', 'json'],
      [csv, 'a.csv', 'csv'],
      [html, 'a.html', 'html'],
      [html, 'A.HTM', 'html'],
    ])('detects an empty MIME by extension (%#)', (content, name, expected) => {
      expect(detectFormat(content, '', name)).toBe(expected)
    })

    it('detects by content when the extension is wrong', () => {
      expect(detectFormat('{"a":1}', '', 'bookmarks.txt')).toBe('json')
      expect(detectFormat(csv, '', 'bookmarks')).toBe('csv')
      expect(detectFormat(html, 'text/plain', 'bookmarks.json')).toBe('html')
    })

    it('keeps unrelated content unknown', () => {
      expect(detectFormat('hello world', '', 'notes.json')).toBe('unknown')
      expect(detectFormat('42', '', 'notes.txt')).toBe('unknown')
    })

    it('never overrides a valid MIME with a different extension', () => {
      expect(detectFormat('{"a":1}', 'application/json', 'a.csv')).toBe('json')
      expect(detectFormat('{"a":1}', 'text/csv', 'a.json')).toBe('unknown')
    })
  })
})
