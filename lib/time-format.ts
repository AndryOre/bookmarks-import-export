export type DayPeriod = 'am' | 'pm'

export interface ClockTime {
  hour: number
  minute: number
}

export interface TwelveHourTime {
  hour: number
  period: DayPeriod
}

const TIME_24H_PATTERN = /^(\d{2}):(\d{2})$/

/**
 * Parses an `HH:MM` 24-hour string into numeric parts.
 * @param value The string to parse.
 * @returns The parsed time, or `null` when the string is malformed or out of range.
 */
export function parseTime24(value: string): ClockTime | null {
  const match = TIME_24H_PATTERN.exec(value)
  if (!match) {
    return null
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour > 23 || minute > 59 ? null : { hour, minute }
}

/**
 * Formats numeric parts as the canonical zero-padded `HH:MM` 24-hour string.
 * @param hour Hour of the day, 0–23.
 * @param minute Minute of the hour, 0–59.
 * @returns The zero-padded `HH:MM` string.
 */
export function formatTime24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/**
 * Converts a 0–23 hour to its 12-hour clock face (1–12) and day period.
 * Midnight is `12 AM` and noon is `12 PM`.
 * @param hour24 Hour of the day, 0–23.
 * @returns The clock face hour and its day period.
 */
export function to12Hour(hour24: number): TwelveHourTime {
  return {
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    period: hour24 < 12 ? 'am' : 'pm',
  }
}

/**
 * Converts a 12-hour clock face (1–12) and day period back to a 0–23 hour.
 * `12 AM` is hour 0 and `12 PM` is hour 12.
 * @param hour12 Clock face hour, 1–12.
 * @param period Whether the hour is before or after noon.
 * @returns The hour of the day, 0–23.
 */
export function from12Hour(hour12: number, period: DayPeriod): number {
  const base = hour12 % 12
  return period === 'pm' ? base + 12 : base
}

/**
 * Whether the given locale conventionally shows a 12-hour clock, per `Intl`.
 * @param locale BCP 47 locale tag; defaults to the runtime locale.
 * @returns `true` for 12-hour locales, `false` for 24-hour ones.
 */
export function is12HourLocale(locale?: string): boolean {
  const { hourCycle } = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
  }).resolvedOptions()
  return hourCycle === 'h11' || hourCycle === 'h12'
}

/**
 * Localized AM and PM labels for the given locale (e.g. `a. m.` / `p. m.`).
 * @param locale BCP 47 locale tag; defaults to the runtime locale.
 * @returns The label for each day period, falling back to `AM`/`PM`.
 */
export function getDayPeriodLabels(locale?: string): Record<DayPeriod, string> {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: true,
  })
  const labelFor = (hour: number): string =>
    formatter
      .formatToParts(new Date(2000, 0, 1, hour))
      .find((part) => part.type === 'dayPeriod')?.value ?? ''
  return { am: labelFor(0) || 'AM', pm: labelFor(12) || 'PM' }
}

/**
 * Formats an `HH:MM` 24-hour string in the given locale's clock convention.
 * @param value The `HH:MM` 24-hour string.
 * @param locale BCP 47 locale tag; defaults to the runtime locale.
 * @returns The localized time, or `value` unchanged when it can't be parsed.
 */
export function formatTimeForDisplay(value: string, locale?: string): string {
  const parsed = parseTime24(value)
  if (!parsed) {
    return value
  }
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, parsed.hour, parsed.minute))
}
