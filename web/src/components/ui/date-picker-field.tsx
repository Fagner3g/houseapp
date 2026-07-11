'use client'

import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { Matcher } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  calendarDateToLocalDate,
  dateToCalendarDate,
  formatDateLabel,
  isoToCalendarDate,
} from '@/lib/date'
import { cn } from '@/lib/utils'

/** Above drawer/dialog overlays (base drawer z-[51], nested z-[101]). */
const POPOVER_ABOVE_OVERLAY_CLASS = 'z-[10010] w-auto overflow-hidden p-0 pointer-events-auto'

const DATE_PICKER_BUTTON_CLASS =
  'h-9 w-full justify-between px-3 font-normal hover:bg-slate-50 hover:text-slate-900 focus-visible:border-slate-400 focus-visible:ring-slate-400/30 data-[state=open]:bg-slate-50 data-[state=open]:text-slate-900'

function parseFormDateString(value?: string | null): Date | undefined {
  if (!value) return undefined
  const key = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : isoToCalendarDate(value)
  if (!key) return undefined
  return calendarDateToLocalDate(key)
}

function formatFormDateString(date?: Date): string {
  if (!date) return ''
  return dateToCalendarDate(date)
}

export type DatePickerProps = {
  value?: Date
  onChange: (date: Date | undefined) => void
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  className?: string
  buttonClassName?: string
  id?: string
  align?: 'start' | 'center' | 'end'
  fromYear?: number
  toYear?: number
  disabledDates?: Matcher | Matcher[]
  'aria-invalid'?: boolean
}

export function DatePicker({
  value,
  onChange,
  disabled,
  minDate,
  maxDate,
  placeholder = 'Selecione a data',
  className,
  buttonClassName,
  id,
  align = 'start',
  fromYear = 1970,
  toYear = new Date().getFullYear() + 10,
  disabledDates,
  'aria-invalid': ariaInvalid,
  ...buttonProps
}: DatePickerProps & React.ComponentProps<'button'>) {
  const [open, setOpen] = useState(false)

  const calendarDisabled =
    disabledDates ??
    (minDate || maxDate
      ? {
          ...(minDate ? { before: minDate } : {}),
          ...(maxDate ? { after: maxDate } : {}),
        }
      : undefined)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          {...buttonProps}
          className={cn(
            DATE_PICKER_BUTTON_CLASS,
            !value && 'text-muted-foreground',
            buttonClassName,
            buttonProps.className
          )}
        >
          <span className="truncate">
            {value ? formatDateLabel(value) : placeholder}
          </span>
          <CalendarIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn(POPOVER_ABOVE_OVERLAY_CLASS, className)}>
        <Calendar
          tone="neutral"
          mode="single"
          selected={value}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          fromDate={minDate}
          toDate={maxDate}
          disabled={calendarDisabled}
          defaultMonth={value ?? minDate ?? maxDate}
          onSelect={date => {
            onChange(date)
            if (date) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export type DatePickerFieldProps = DatePickerProps & {
  label?: React.ReactNode
  labelClassName?: string
}

export function DatePickerField({ label, labelClassName, id, ...props }: DatePickerFieldProps) {
  return (
    <div className="space-y-2">
      {label ? (
        <Label htmlFor={id} className={labelClassName}>
          {label}
        </Label>
      ) : null}
      <DatePicker id={id} {...props} />
    </div>
  )
}

/** DatePicker bound to `YYYY-MM-DD` strings (react-hook-form friendly). */
export type DatePickerInputProps = Omit<DatePickerProps, 'value' | 'onChange'> & {
  value?: string | null
  onChange: (value: string) => void
}

export function DatePickerInput({ value, onChange, ...props }: DatePickerInputProps) {
  return (
    <DatePicker
      {...props}
      value={parseFormDateString(value)}
      onChange={date => onChange(formatFormDateString(date))}
    />
  )
}
