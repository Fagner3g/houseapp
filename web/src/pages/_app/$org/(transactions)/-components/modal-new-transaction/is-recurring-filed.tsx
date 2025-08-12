import type { UseFormReturn } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import type { NewTransactionSchema } from './schema'

export interface RecurrenceFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceField({ form }: RecurrenceFieldProps) {
  return (
    <FormField
      control={form.control}
      name="isRecurring"
      render={({ field }) => (
        <FormItem className="flex-1 items-end">
          <FormControl>
            <Label className="hover:bg-accent/50 rounded-lg border p-2.5 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
              <Checkbox
                id="toggle-2"
                defaultChecked={false}
                value={field.value ? 1 : 0}
                onCheckedChange={checked => field.onChange(!!checked)}
              />
              <p>Recorrente</p>
            </Label>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
