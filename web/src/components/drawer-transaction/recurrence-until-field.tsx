import { ChevronDownIcon } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { NewTransactionSchema } from './schema'

interface RecurrenceUntilFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceUntilField({ form }: RecurrenceUntilFieldProps) {
  const [open, setOpen] = useState(false)
  const checkboxId = useId()
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
          <FormLabel className="flex items-center justify-between gap-2">
            <span>Data final da recorrência</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(form.watch('recurrenceInfinite'))}
                onCheckedChange={v => {
                  const checked = Boolean(v)
                  form.setValue('recurrenceInfinite', checked, { shouldDirty: true })
                  if (checked) {
                    form.setValue('recurrenceUntil', undefined, { shouldDirty: true })
                    form.clearErrors('recurrenceUntil')
                  }
                }}
                id={checkboxId}
              />
              <label htmlFor={checkboxId} className="text-xs text-muted-foreground">
                Sem data de término
              </label>
            </div>
          </FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-invalid={!!form.formState.errors.recurrenceUntil}
                  className={cn(
                    'w-full justify-between font-normal',
                    !field.value && !form.watch('recurrenceInfinite') && 'text-muted-foreground',
                    form.formState.errors.recurrenceUntil && !form.watch('recurrenceInfinite')
                      ? 'border-destructive ring-1 ring-destructive/50'
                      : ''
                  )}
                  disabled={Boolean(form.watch('recurrenceInfinite'))}
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
                  className="border-amber-400"
                  onSelect={date => {
                    if (!date) {
                      field.onChange(undefined)
                      setOpen(false)
                      return
                    }
                    const min = minEndDate
                    if (date < min) return
                    field.onChange(date)
                    setOpen(false)
                  }}
                />
                <div className="flex items-center gap-2 p-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      field.onChange(undefined)
                      setOpen(false)
                    }}
                  >
                    Sem data de término
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </FormControl>
          <p className="text-[10px] text-muted-foreground">
            Usado no modo "Termina em": última ocorrência. Opcional quando "Sem data de término".
          </p>
        </FormItem>
      )}
    />
  )
}
