import type { UseFormReturn } from 'react-hook-form'

import { CurrencyInput } from '@/components/ui/currency-input'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import type { NewTransactionSchema } from './schema'

export interface AmountFieldProps {
  form: UseFormReturn<NewTransactionSchema>
  disabled?: boolean
}

export function AmountField({ form, disabled }: AmountFieldProps) {
  return (
    <FormField
      control={form.control}
      name="amount"
      render={({ field }) => (
        <FormItem className="flex-1">
          <FormLabel>Valor (R$)</FormLabel>
          <FormControl>
            <CurrencyInput
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ? (Number(field.value) ?? 0) : 0}
              onValueChange={e => {
                field.onChange(e)
                field.onChange(String(e))
              }}
              placeholder="R$ 0,00"
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
