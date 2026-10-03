import { describe, expect, it } from 'vitest'

import { sanitizePathSegment } from './path-segment'

describe('sanitizePathSegment', () => {
  it.each<[string, string]>([
    ['.backups', 'backups'],
    ['...hidden', 'hidden'],
    ['Backups ', 'Backups'],
    ['name.', 'name'],
    ['name. . ', 'name'],
    ['.', ''],
    ['..', ''],
    ['...', ''],
    ['  ', ''],
    ['con', '_con'],
    ['CON', '_CON'],
    ['nul.txt', '_nul.txt'],
    ['Com1', '_Com1'],
    ['lpt9.log', '_lpt9.log'],
    ['con .', '_con'],
    ['console', 'console'],
    ['com0', 'com0'],
    ['a..b', 'a..b'],
    ['Bookmarks 2024-01-01', 'Bookmarks 2024-01-01'],
  ])('%j -> %j', (input, expected) => {
    expect(sanitizePathSegment(input)).toBe(expected)
  })
})
