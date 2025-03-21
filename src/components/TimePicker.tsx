import * as React from "react"

import {
  display12HourValue,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  setDateByType,
  TimePickerInput,
  type Period
} from "~/components"

interface TimePickerProps {
  time: string
  setTime: (time: string) => void
  disabled?: boolean
  className?: string
}

export function TimePicker({
  time,
  setTime,
  disabled = false,
  className = ""
}: TimePickerProps) {
  const date = React.useMemo(() => {
    const [hours, minutes] = time.split(":")
    const d = new Date()
    d.setHours(parseInt(hours))
    d.setMinutes(parseInt(minutes))
    return d
  }, [time])

  const [period, setPeriod] = React.useState<Period>(
    parseInt(time.split(":")[0]) >= 12 ? "PM" : "AM"
  )

  const minuteRef = React.useRef<HTMLInputElement>(null)
  const hourRef = React.useRef<HTMLInputElement>(null)
  const periodRef = React.useRef<HTMLButtonElement>(null)

  const handleTimeChange = (newDate: Date | undefined) => {
    if (!newDate) return

    let hours = newDate.getHours()
    const minutes = newDate.getMinutes()

    // Convert to 12-hour format for display
    if (period === "PM" && hours < 12) hours += 12
    if (period === "AM" && hours === 12) hours = 0
    if (period === "PM" && hours === 0) hours = 12

    setTime(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    )
  }

  const handlePeriodChange = (value: Period) => {
    setPeriod(value)
    const tempDate = new Date(date)
    const hours = display12HourValue(date.getHours())
    handleTimeChange(
      setDateByType(
        tempDate,
        hours.toString(),
        "12hours",
        period === "AM" ? "PM" : "AM"
      )
    )
  }

  // Convert display hours to 12-hour format
  const display12Hour = React.useMemo(() => {
    const hours = date.getHours()
    if (hours === 0) return 12
    if (hours > 12) return hours - 12
    return hours
  }, [date])

  return (
    <div className={`plasmo-flex plasmo-items-end plasmo-gap-2 ${className}`}>
      <div className="plasmo-grid plasmo-gap-1 plasmo-text-center plasmo-w-16">
        <Label htmlFor="hours" className="plasmo-text-xs">
          Hours
        </Label>
        <TimePickerInput
          picker="hours"
          date={(() => {
            const displayTimeDate = new Date(date)
            displayTimeDate.setHours(display12Hour)
            return displayTimeDate
          })()}
          setDate={handleTimeChange}
          ref={hourRef}
          disabled={disabled}
          onRightFocus={() => minuteRef.current?.focus()}
        />
      </div>
      <div className="plasmo-grid plasmo-gap-1 plasmo-text-center plasmo-w-16">
        <Label htmlFor="minutes" className="plasmo-text-xs">
          Minutes
        </Label>
        <TimePickerInput
          picker="minutes"
          date={date}
          setDate={handleTimeChange}
          ref={minuteRef}
          disabled={disabled}
          onLeftFocus={() => hourRef.current?.focus()}
          onRightFocus={() => periodRef.current?.focus()}
        />
      </div>
      <div className="plasmo-grid plasmo-gap-1 plasmo-text-center plasmo-w-16">
        <Label className="plasmo-text-xs">Period</Label>
        <Select
          value={period}
          onValueChange={handlePeriodChange}
          disabled={disabled}>
          <SelectTrigger
            ref={periodRef}
            className="plasmo-w-[65px] focus:plasmo-bg-accent focus:plasmo-text-accent-foreground"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") minuteRef.current?.focus()
            }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
