import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { CurrencyInput } from '@/components/ui/currency-input'
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
            <CurrencyInput
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? 0}
              onValueChange={field.onChange}
              placeholder="R$ 0,00"
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
