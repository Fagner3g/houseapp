import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { NewTransactionSchema } from '@/components/drawer-transaction/schema'
import { DatePicker } from '@/components/ui/date-picker-field'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'

interface CalendarFieldProps {
  form: UseFormReturn<NewTransactionSchema>
  disabled?: boolean
}

export function CalendarField({ form, disabled }: CalendarFieldProps) {
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
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
              buttonClassName="sm:w-48"
              aria-invalid={!!form.formState.errors.dueDate}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
