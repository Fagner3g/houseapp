import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { NewTransactionSchema } from './schema'

export interface InstallmentsTotalFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function InstallmentsTotalField({ form }: InstallmentsTotalFieldProps) {
  // Show/validate this field ONLY when recurrence is enabled
  const isRecurring = form.watch('isRecurring')
  if (!isRecurring) return null

  return (
    <FormField
      control={form.control}
      name="installmentsTotal"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nº Parcelas</FormLabel>
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
