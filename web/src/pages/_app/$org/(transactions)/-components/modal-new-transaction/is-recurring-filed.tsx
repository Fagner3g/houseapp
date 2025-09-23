import { useId } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import type { NewTransactionSchema } from './schema'

export interface RecurrenceFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceField({ form }: RecurrenceFieldProps) {
  const id = useId()
  
  return (
    <FormField
      control={form.control}
      name="isRecurring"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={id}
                checked={field.value}
                onCheckedChange={checked => field.onChange(!!checked)}
              />
              <Label 
                htmlFor={id} 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Recorrente
              </Label>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
