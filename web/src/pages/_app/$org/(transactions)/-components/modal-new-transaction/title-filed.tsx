import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { NewTransactionSchema } from './schema'

export interface TitleFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function TitleField({ form }: TitleFieldProps) {
  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Título</FormLabel>
          <FormControl>
            <Input {...field} placeholder="Ex: Aluguel, luz, etc..." value={field.value || ''} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
