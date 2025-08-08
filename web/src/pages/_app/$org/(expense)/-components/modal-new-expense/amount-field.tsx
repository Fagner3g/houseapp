import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { FormValues } from '.'

export interface AmountFieldProps {
  form: UseFormReturn<FormValues>
}

export function AmountField({ form }: AmountFieldProps) {
  return (
    <FormField
      control={form.control}
      name="amount"
      render={({ field }) => (
        <FormItem className="flex-1">
          <FormLabel>Preço (R$)</FormLabel>
          <FormControl>
            <Input {...field} value={field.value || ''} placeholder="R$ 0,00" />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
