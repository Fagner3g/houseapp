import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { FormValues } from '.'

interface RecurrenceUntilFieldProps {
  form: UseFormReturn<FormValues>
}

export function RecurrenceUntilField({ form }: RecurrenceUntilFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <FormField
      control={form.control}
      name="recurrenceUntil"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Data de término</FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-invalid={!!form.formState.errors.recurrenceUntil}
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
