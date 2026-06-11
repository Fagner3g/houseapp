'use client'

import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import type { Matcher } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateLabel } from '@/lib/date'
import { cn } from '@/lib/utils'

/** Above Dialog overlay/content (z-[9999]). */
const POPOVER_ABOVE_DIALOG_CLASS = 'z-[10010] w-auto overflow-hidden p-0 pointer-events-auto'

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
}: DatePickerProps) {
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
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            buttonClassName
          )}
        >
          {value ? formatDateLabel(value) : placeholder}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn(POPOVER_ABOVE_DIALOG_CLASS, className)}>
        <Calendar
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
