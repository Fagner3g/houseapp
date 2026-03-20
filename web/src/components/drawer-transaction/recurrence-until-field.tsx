import { ChevronDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { NewTransactionSchema } from './schema'

interface RecurrenceUntilFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceUntilField({ form }: RecurrenceUntilFieldProps) {
  const [open, setOpen] = useState(false)
  const currentYear = new Date().getFullYear()
  const dueDate = form.watch('dueDate') as Date | undefined
  const recurrenceType = form.watch('recurrenceType') as 'weekly' | 'monthly' | 'yearly' | undefined
  const recurrenceInterval = form.watch('recurrenceInterval') as number | undefined

  const minEndDate = useMemo(() => {
    if (!dueDate) return new Date()
    const i = Math.max(
      1,
      Number.isFinite(recurrenceInterval as number) ? (recurrenceInterval as number) : 1
    )
    const d = new Date(dueDate)
    if (recurrenceType === 'weekly') {
      d.setDate(d.getDate() + i * 7)
      return d
    }
    if (recurrenceType === 'yearly') {
      return new Date(d.getFullYear() + i, d.getMonth(), d.getDate())
    }
    // default monthly
    return new Date(d.getFullYear(), d.getMonth() + i, d.getDate())
  }, [dueDate, recurrenceType, recurrenceInterval])

  return (
    <FormField
      control={form.control}
      name="recurrenceUntil"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Data final da recorrência</FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-invalid={!!form.formState.errors.recurrenceUntil}
                  className={cn(
                    'w-full justify-between font-normal',
                    !field.value && 'text-muted-foreground',
                    form.formState.errors.recurrenceUntil
                      ? 'border-destructive ring-1 ring-destructive/50'
                      : ''
                  )}
                >
                  {field.value ? field.value.toLocaleDateString() : 'Selecione a data'}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-[90] w-auto overflow-hidden p-0 pointer-events-auto"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={field.value}
                  captionLayout="dropdown"
                  fromYear={1970}
                  toYear={currentYear + 10}
                  fromDate={minEndDate}
                  disabled={{ before: minEndDate }}
                  defaultMonth={minEndDate}
                  onSelect={date => {
                    if (!date) {
                      field.onChange(undefined)
                      setOpen(false)
                      return
                    }
                    if (date < minEndDate) return
                    field.onChange(date)
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
