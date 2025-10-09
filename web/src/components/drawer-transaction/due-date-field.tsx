import { ChevronDownIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { NewTransactionSchema } from '@/components/drawer-transaction/schema'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface CalendarFieldProps {
  form: UseFormReturn<NewTransactionSchema>
  disabled?: boolean
}

export function CalendarField({ form, disabled }: CalendarFieldProps) {
  const [open, setOpen] = useState(false)

  // Garantir que o campo começa preenchido com a data de hoje
  useEffect(() => {
    const current = form.getValues('dueDate')
    if (!current) {
      form.setValue('dueDate', new Date(), { shouldDirty: false, shouldTouch: false })
    }
  }, [form])

  return (
    <FormField
      control={form.control}
      name="dueDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Vencimento</FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-invalid={!!form.formState.errors.dueDate}
                  className={cn('w-full justify-between font-normal sm:w-48')}
                  disabled={disabled}
                >
                  {field.value ? field.value.toLocaleDateString() : 'Selecione a data'}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[90] w-auto overflow-hidden p-0 pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={field.value}
                  captionLayout="dropdown"
                  className="border-amber-400"
                  onSelect={date => {
                    field.onChange(date)
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
