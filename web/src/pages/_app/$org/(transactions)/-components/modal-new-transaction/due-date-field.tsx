import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { NewTransactionSchema } from './schema'

interface CalendarFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function CalendarField({ form }: CalendarFieldProps) {
  const [open, setOpen] = useState(false)

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
                  className={cn(
                    'w-48 justify-between font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  {field.value ? field.value.toLocaleDateString() : 'Selecione a data'}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
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
