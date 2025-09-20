'use client'

import { endOfMonth, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, CalendarIcon, Check } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  className?: string
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  showFooter?: boolean
  onApply?: (range: DateRange | undefined) => void
  onApplyCurrentMonth?: () => void
}

export function DateRangePicker({
  className,
  value,
  onChange,
  placeholder = 'Selecione o período',
  disabled = false,
  showFooter = false,
  onApply,
  onApplyCurrentMonth,
}: DateRangePickerProps) {
  const id = useId()
  const [localRange, setLocalRange] = useState<DateRange | undefined>(value)
  const [open, setOpen] = useState(false)

  // Sincronizar estado local com prop value
  useEffect(() => {
    setLocalRange(value)
  }, [value])

  const handleApply = () => {
    if (onApply) {
      onApply(localRange)
    } else if (onChange) {
      onChange(localRange)
    }
    setOpen(false)
  }

  const handleApplyCurrentMonth = () => {
    const now = new Date()
    const currentMonthRange: DateRange = {
      from: startOfMonth(now),
      to: endOfMonth(now),
    }

    setLocalRange(currentMonthRange)

    if (onApplyCurrentMonth) {
      onApplyCurrentMonth()
    } else if (onApply) {
      onApply(currentMonthRange)
    } else if (onChange) {
      onChange(currentMonthRange)
    }
    setOpen(false)
  }

  const handleRangeChange = (range: DateRange | undefined) => {
    setLocalRange(range)
    // Se não tem footer, aplica imediatamente
    if (!showFooter && onChange) {
      onChange(range)
    }
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                  {format(value.to, 'dd/MM/yyyy', { locale: ptBR })}
                </>
              ) : (
                format(value.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={localRange?.from}
            selected={localRange}
            onSelect={handleRangeChange}
            numberOfMonths={2}
            locale={ptBR}
          />
          {showFooter && (
            <div className="flex items-center justify-between p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleApplyCurrentMonth}
                className="h-8 px-3 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Mês atual
              </Button>
              <Button size="sm" onClick={handleApply} className="h-8 px-3 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Aplicar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
