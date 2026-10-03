import { describe, expect, it } from 'vitest'

import { formatCount } from './format-count'

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [1, '1'],
    [2, '2'],
    [1_234_567, '1,234,567'],
  ])('formats %d for en', (value, expected) => {
    expect(formatCount(value, 'en')).toBe(expected)
  })

  it('groups a large number the Russian way', () => {
    expect(formatCount(1_234_567, 'ru')).toBe(
      new Intl.NumberFormat('ru').format(1_234_567),
    )
    expect(formatCount(1_234_567, 'ru')).not.toBe('1,234,567')
  })

  it('groups a large number the German way', () => {
    expect(formatCount(1_234_567, 'de')).toBe('1.234.567')
  })
})
