import { describe, expect, it } from 'vitest'

import {
  formatTime24,
  formatTimeForDisplay,
  from12Hour,
  getDayPeriodLabels,
  is12HourLocale,
  parseTime24,
  to12Hour,
} from './time-format'

describe('parseTime24', () => {
  it('parses a valid HH:MM string', () => {
    expect(parseTime24('09:05')).toEqual({ hour: 9, minute: 5 })
  })

  it.each(['24:00', '12:60', '9:05', '', 'ab:cd'])('rejects %j', (value) => {
    expect(parseTime24(value)).toBeNull()
  })
})

describe('formatTime24', () => {
  it('zero-pads both parts', () => {
    expect(formatTime24(0, 0)).toBe('00:00')
    expect(formatTime24(7, 5)).toBe('07:05')
  })
})

describe('to12Hour', () => {
  it('maps midnight to 12 AM', () => {
    expect(to12Hour(0)).toEqual({ hour: 12, period: 'am' })
  })

  it('maps noon to 12 PM', () => {
    expect(to12Hour(12)).toEqual({ hour: 12, period: 'pm' })
  })

  it('maps the edges of each half', () => {
    expect(to12Hour(1)).toEqual({ hour: 1, period: 'am' })
    expect(to12Hour(11)).toEqual({ hour: 11, period: 'am' })
    expect(to12Hour(13)).toEqual({ hour: 1, period: 'pm' })
    expect(to12Hour(23)).toEqual({ hour: 11, period: 'pm' })
  })
})

describe('from12Hour', () => {
  it('maps 12 AM to midnight and 12 PM to noon', () => {
    expect(from12Hour(12, 'am')).toBe(0)
    expect(from12Hour(12, 'pm')).toBe(12)
  })

  it('round-trips every hour of the day', () => {
    for (let hour = 0; hour < 24; hour++) {
      const { hour: hour12, period } = to12Hour(hour)
      expect(from12Hour(hour12, period)).toBe(hour)
    }
  })
})

describe('is12HourLocale', () => {
  it('is true for 12-hour locales', () => {
    expect(is12HourLocale('en-US')).toBe(true)
  })

  it('is false for 24-hour locales', () => {
    expect(is12HourLocale('de-DE')).toBe(false)
    expect(is12HourLocale('es-ES')).toBe(false)
  })
})

describe('getDayPeriodLabels', () => {
  it('returns the English AM and PM labels', () => {
    expect(getDayPeriodLabels('en-US')).toEqual({ am: 'AM', pm: 'PM' })
  })
})

describe('formatTimeForDisplay', () => {
  it('uses the 12-hour convention for en-US', () => {
    expect(formatTimeForDisplay('00:00', 'en-US')).toMatch(/^12:00\sAM$/)
    expect(formatTimeForDisplay('12:30', 'en-US')).toMatch(/^12:30\sPM$/)
  })

  it('uses the 24-hour convention for de-DE', () => {
    expect(formatTimeForDisplay('18:05', 'de-DE')).toBe('18:05')
  })

  it('returns malformed input unchanged', () => {
    expect(formatTimeForDisplay('nope', 'en-US')).toBe('nope')
  })
})
