import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NewTransactionSchema } from './schema'

export interface RecurrenceTypeFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceTypeField({ form }: RecurrenceTypeFieldProps) {
  const hasError = Boolean(form.formState.errors.recurrenceType)
  return (
    <FormField
      control={form.control}
      name="recurrenceType"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value?.toString() || ''}>
              <SelectTrigger
                aria-invalid={hasError}
                className={`h-9 w-full ${hasError ? 'border-destructive ring-1 ring-destructive/50' : ''}`}
              >
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="weekly">Semanal (toda semana)</SelectItem>
                  <SelectItem value="monthly">Mensal (todo mês)</SelectItem>
                  <SelectItem value="yearly">Anual (todo ano)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription className="text-xs">
            Define a frequência base. Combine com o intervalo.
          </FormDescription>
        </FormItem>
      )}
    />
  )
}
