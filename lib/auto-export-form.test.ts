import { describe, expect, it } from 'vitest'

import {
  parseKeepLast,
  resolveFolder,
  resolveFormats,
} from './auto-export-form'

describe('resolveFormats', () => {
  it('keeps the selection when it is not empty', () => {
    expect(resolveFormats(['html', 'csv'], ['html'])).toEqual(['html', 'csv'])
  })

  it('keeps the previous selection when the last format is turned off', () => {
    expect(resolveFormats([], ['json'])).toEqual(['json'])
  })

  it('orders formats canonically', () => {
    expect(resolveFormats(['csv', 'html'], ['html'])).toEqual(['html', 'csv'])
  })
})

describe('resolveFolder', () => {
  it('trims the typed folder', () => {
    expect(resolveFolder('  backups/  ', 'old/')).toBe('backups/')
  })

  it('falls back to the previous folder when blank', () => {
    expect(resolveFolder(' '.repeat(3), 'old/')).toBe('old/')
  })
})

describe('parseKeepLast', () => {
  it.each<[string, number]>([
    ['10', 10],
    ['0', 0],
    [' 7 ', 7],
  ])('accepts %j', (typed, expected) => {
    expect(parseKeepLast(typed)).toBe(expected)
  })

  it.each(['', '  ', '-1', '1.5', 'abc', '1e3', '99999999999999999999'])(
    'rejects %j',
    (typed) => {
      expect(parseKeepLast(typed)).toBeNull()
    },
  )
})
