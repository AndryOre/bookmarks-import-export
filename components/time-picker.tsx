import { ChevronDownIcon, ClockIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  type DayPeriod,
  formatTime24,
  formatTimeForDisplay,
  from12Hour,
  getDayPeriodLabels,
  is12HourLocale,
  parseTime24,
  to12Hour,
} from '@/lib/time-format'

const HOURS_24 = Array.from({ length: 24 }, (_, hour) => hour)
const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute)
const DAY_PERIODS: DayPeriod[] = ['am', 'pm']
const FALLBACK_TIME = { hour: 0, minute: 0 }

interface TimePickerOption<Value extends number | string> {
  value: Value
  label: string
}

interface TimePickerColumnProperties<Value extends number | string> {
  label: string
  options: TimePickerOption<Value>[]
  selected: Value
  onSelect: (value: Value) => void
  onCommit: () => void
}

function toNumberOptions(values: number[]): TimePickerOption<number>[] {
  return values.map((value) => ({
    value,
    label: String(value).padStart(2, '0'),
  }))
}

/**
 * One scrollable listbox column. Only the selected option is in the tab
 * order (roving tabindex), so Tab moves between columns while the arrow keys,
 * Home and End move within one, and Enter commits. Moving focus also selects,
 * which keeps the draft in sync with what a keyboard user is looking at.
 * @param properties The column's accessible name, options and selection.
 * @returns The scrollable listbox.
 */
function TimePickerColumn<Value extends number | string>(
  properties: TimePickerColumnProperties<Value>,
) {
  const { label, options, selected, onSelect, onCommit } = properties
  const listReference = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    listReference.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [])

  function moveTo(index: number) {
    const target = options[index]
    if (!target) {
      return
    }
    onSelect(target.value)
    listReference.current
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      [index]?.focus()
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === 'Enter') {
      event.preventDefault()
      onCommit()
      return
    }
    const targets: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    }
    const targetIndex = targets[event.key]
    if (targetIndex === undefined) {
      return
    }
    event.preventDefault()
    moveTo(targetIndex)
  }

  return (
    <ScrollArea className="h-56 w-14">
      <div
        ref={listReference}
        role="listbox"
        aria-label={label}
        aria-orientation="vertical"
        className="flex flex-col gap-0.5 p-1"
      >
        {options.map((option, index) => {
          const isSelected = option.value === selected
          return (
            <Button
              key={option.value}
              type="button"
              role="option"
              size="sm"
              variant={isSelected ? 'default' : 'ghost'}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className="justify-center"
              onClick={() => onSelect(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="tabular-nums">{option.label}</span>
            </Button>
          )
        })}
      </div>
    </ScrollArea>
  )
}

export interface TimePickerProperties {
  /**
  The current time as a 24-hour `HH:MM` string.
   */
  value: string
  /**
  Called with a 24-hour `HH:MM` string, whichever clock is displayed.
   */
  onChange: (value: string) => void
  /**
  Accessible name of the hour column.
   */
  hourLabel: string
  /**
  Accessible name of the minute column.
   */
  minuteLabel: string
  /**
  Accessible name of the AM/PM column, only rendered on 12-hour clocks.
   */
  periodLabel: string
  /**
   * BCP 47 locale deciding between the 12-hour and 24-hour clock and the
   * AM/PM wording. Defaults to the runtime locale.
   */
  locale?: string
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  disabled?: boolean
}

/**
 * A locale-aware time picker: a select-styled trigger showing the
 * formatted time, opening a popover with scrollable hour and minute columns
 * and, on 12-hour locales, an AM/PM column. The value in and out is always a
 * 24-hour `HH:MM` string. Selections edit a local draft while the popover is
 * open; `onChange` fires once when it closes (Enter, Escape, outside click),
 * and only if the draft differs from `value`.
 *
 * Keyboard: Tab reaches the trigger, Enter or Space opens it, Tab moves
 * between columns, the arrow keys, Home and End move within one, and Escape
 * closes it. Pass `aria-labelledby` or `id` from a `FieldLabel` to wire it
 * into a `Field`.
 * @param properties The picker's value, change handler, labels and trigger attributes.
 * @returns The trigger button and its popover.
 */
export function TimePicker(properties: TimePickerProperties) {
  const {
    value,
    onChange,
    hourLabel,
    minuteLabel,
    periodLabel,
    locale,
    ...triggerProperties
  } = properties
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const { hour, minute } = parseTime24(open ? draft : value) ?? FALLBACK_TIME
  const is12Hour = is12HourLocale(locale)
  const twelveHour = to12Hour(hour)
  const dayPeriodLabels = getDayPeriodLabels(locale)

  function emit(nextHour: number, nextMinute: number) {
    setDraft(formatTime24(nextHour, nextMinute))
  }

  function handleOpenChange(isOpening: boolean) {
    if (isOpening) {
      setDraft(value)
    } else if (draft !== value) {
      onChange(draft)
    }
    setOpen(isOpening)
  }

  function commit() {
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            {...triggerProperties}
          />
        }
      >
        <span className="flex items-center gap-2">
          <ClockIcon data-icon="inline-start" aria-hidden="true" />
          <span className="tabular-nums">
            {formatTimeForDisplay(formatTime24(hour, minute), locale)}
          </span>
        </span>
        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <div className="flex flex-row">
          {is12Hour ? (
            <TimePickerColumn
              label={hourLabel}
              options={toNumberOptions(HOURS_12)}
              selected={twelveHour.hour}
              onSelect={(next) =>
                emit(from12Hour(next, twelveHour.period), minute)
              }
              onCommit={commit}
            />
          ) : (
            <TimePickerColumn
              label={hourLabel}
              options={toNumberOptions(HOURS_24)}
              selected={hour}
              onSelect={(next) => emit(next, minute)}
              onCommit={commit}
            />
          )}
          <Separator orientation="vertical" />
          <TimePickerColumn
            label={minuteLabel}
            options={toNumberOptions(MINUTES)}
            selected={minute}
            onSelect={(next) => emit(hour, next)}
            onCommit={commit}
          />
          {is12Hour ? (
            <>
              <Separator orientation="vertical" />
              <TimePickerColumn
                label={periodLabel}
                options={DAY_PERIODS.map((period) => ({
                  value: period,
                  label: dayPeriodLabels[period],
                }))}
                selected={twelveHour.period}
                onSelect={(next) =>
                  emit(from12Hour(twelveHour.hour, next), minute)
                }
                onCommit={commit}
              />
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
