import { describe, expect, it } from 'vitest'

import { isMinorOrMajorUpdate, isWhatsNewUnseen } from './version'

describe('isMinorOrMajorUpdate', () => {
  it.each([
    ['1.7.0', '1.8.0', true],
    ['1.7.0', '2.0.0', true],
    ['2.0.0', '2.0.1', false],
    ['2.0.0', '2.0.0', false],
    [undefined, '2.0.0', false],
  ])('%s -> %s is %s', (previous, current, expected) => {
    expect(isMinorOrMajorUpdate(previous, current)).toBe(expected)
  })
})

describe('isWhatsNewUnseen', () => {
  it('is unseen when nothing was ever marked seen', () => {
    expect(isWhatsNewUnseen(null, '2.0.0')).toBe(true)
  })

  it('is seen after a patch-only update', () => {
    expect(isWhatsNewUnseen('2.0.0', '2.0.1')).toBe(false)
  })

  it('is unseen after a minor or major update', () => {
    expect(isWhatsNewUnseen('1.7.0', '2.0.0')).toBe(true)
    expect(isWhatsNewUnseen('2.0.0', '2.1.0')).toBe(true)
  })

  it('is seen when versions match', () => {
    expect(isWhatsNewUnseen('2.0.0', '2.0.0')).toBe(false)
  })
})
