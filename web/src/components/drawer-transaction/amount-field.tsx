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
                // Garantir formato decimal com 2 casas
                const stringValue = e.toFixed(2)
                field.onChange(stringValue)
              }}
              onChange={e => {
                // Extrair o valor numérico do input formatado
                const raw = e.target.value.replace(/\D/g, '')
                const numeric = Number(raw) / 100
                // Garantir formato decimal com 2 casas
                const stringValue = numeric.toFixed(2)
                field.onChange(stringValue)
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
