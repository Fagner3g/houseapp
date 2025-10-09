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

export interface RecurrenceSelectorFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceSelectorField({ form }: RecurrenceSelectorFieldProps) {
  const hasError = Boolean(form.formState.errors.recurrenceSelector)
  return (
    <FormField
      control={form.control}
      name="recurrenceSelector"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value?.toString() || ''}>
              <SelectTrigger
                aria-invalid={hasError}
                className={`h-9 w-full ${hasError ? 'border-destructive ring-1 ring-destructive/50' : ''}`}
              >
                <SelectValue placeholder="Selecione" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="date">Termina em</SelectItem>
                  <SelectItem value="repeat">Repete</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription className="text-xs">
            “Termina em” exige data final. “Repete” usa total de parcelas.
          </FormDescription>
        </FormItem>
      )}
    />
  )
}
