import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { NewTransactionSchema } from './schema'

export interface AmountFieldProps {
  form: UseFormReturn<NewTransactionSchema>
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
            <Input
              {...field}
              onChange={e => field.onChange(Number(e.target.value))}
              value={field.value || 0}
              placeholder="R$ 0,00"
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
