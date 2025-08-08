import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { FormValues } from '.'

export interface RecurrenceIntervalFieldProps {
  form: UseFormReturn<FormValues>
}

export function RecurrenceIntervalField({ form }: RecurrenceIntervalFieldProps) {
  return (
    <FormField
      control={form.control}
      name="recurrenceInterval"
      render={({ field }) => (
        <FormItem className="justify-center">
          <FormLabel>Nº Repetições</FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              value={field.value || ''}
              onChange={value => {
                const number = Number(value.target.value)
                if (number <= 0 || number >= 100) {
                  return
                }
                field.onChange(number)
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
