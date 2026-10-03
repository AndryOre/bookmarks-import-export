import { describe, expect, it } from 'vitest'

import { formatFilenameTemplate } from './filename-template'

describe('formatFilenameTemplate', () => {
  /**
  2024-03-05 09:07:03
   */
  const date = new Date(2024, 2, 5, 9, 7, 3)

  it('substitutes all supported placeholders', () => {
    expect(formatFilenameTemplate('%yyyy-%mm-%dd_%hh-%min-%sec', date)).toBe(
      '2024-03-05_09-07-03',
    )
  })

  it('substitutes the 2-digit year placeholder', () => {
    expect(formatFilenameTemplate('%yy', date)).toBe('24')
  })

  it('is case-insensitive on placeholders', () => {
    expect(formatFilenameTemplate('%YYYY-%MM-%DD', date)).toBe('2024-03-05')
  })

  it('sanitizes filesystem-unsafe characters', () => {
    expect(formatFilenameTemplate(String.raw`a/b\c:d*e?f"g<h>i|j`, date)).toBe(
      'a_b_c_d_e_f_g_h_i_j',
    )
  })

  it('collapses runs of whitespace and trims the result', () => {
    expect(formatFilenameTemplate('  My   Bookmarks  ', date)).toBe(
      'My Bookmarks',
    )
  })

  it('falls back to "Bookmarks" when the result is empty', () => {
    expect(formatFilenameTemplate(' '.repeat(3), date)).toBe('Bookmarks')
  })

  it('replaces filesystem-unsafe-only input with underscores rather than falling back', () => {
    expect(formatFilenameTemplate('///', date)).toBe('___')
  })

  it.each<[string, string]>([
    ['.x', 'x'],
    ['con', '_con'],
    ['nul.txt', '_nul.txt'],
    ['name. ', 'name'],
    ['...', 'Bookmarks'],
  ])(
    'produces a downloads-safe filename for %j -> %j',
    (template, expected) => {
      expect(formatFilenameTemplate(template, date)).toBe(expected)
    },
  )

  it('defaults to the current date when none is provided', () => {
    const result = formatFilenameTemplate('%yyyy')
    expect(result).toBe(String(new Date().getFullYear()))
  })
})
