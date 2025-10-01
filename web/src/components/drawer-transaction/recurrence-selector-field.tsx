import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NewTransactionSchema } from './schema'

export interface RecurrenceSelectorFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceSelectorField({ form }: RecurrenceSelectorFieldProps) {
  return (
    <FormField
      control={form.control}
      name="recurrenceSelector"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Modo</FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value?.toString() || ''}>
              <SelectTrigger aria-invalid={!!form.formState.errors.recurrenceSelector}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="date">Termina em</SelectItem>
                  <SelectItem value="repeat">Repete</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
