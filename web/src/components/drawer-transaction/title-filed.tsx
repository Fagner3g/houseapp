import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { NewTransactionSchema } from './schema'

export interface TitleFieldProps {
  form: UseFormReturn<NewTransactionSchema>
  disabled?: boolean
}

export function TitleField({ form, disabled }: TitleFieldProps) {
  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Título</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={
                form.getValues('type') === 'expense'
                  ? 'Ex: Aluguel, luz, etc...'
                  : 'Ex: Salário, vendas, etc...'
              }
              value={field.value || ''}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
