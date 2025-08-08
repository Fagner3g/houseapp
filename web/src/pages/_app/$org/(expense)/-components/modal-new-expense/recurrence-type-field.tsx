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
import type { FormValues } from '.'

export interface RecurrenceTypeFieldProps {
  form: UseFormReturn<FormValues>
}

export function RecurrenceTypeField({ form }: RecurrenceTypeFieldProps) {
  return (
    <FormField
      control={form.control}
      name="recurrenceType"
      render={({ field }) => (
        <FormItem className="justify-center">
          <FormLabel>Recorrência</FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value?.toString() || ''}>
              <SelectTrigger aria-invalid={!!form.formState.errors.recurrenceType}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
