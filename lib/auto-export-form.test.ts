import { describe, expect, it } from 'vitest'

import { resolveFolder, resolveFormats } from './auto-export-form'

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
