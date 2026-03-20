import { useId } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { NewTransactionSchema } from './schema'

export interface RecurrenceSelectorFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceSelectorField({ form }: RecurrenceSelectorFieldProps) {
  const uid = useId()
  const ids = { infinite: `${uid}-infinite`, times: `${uid}-times`, until: `${uid}-until` }

  return (
    <FormField
      control={form.control}
      name="recurrenceSelector"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-muted-foreground">Duração</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={value => {
                field.onChange(value)
                if (value !== 'times') form.setValue('installmentsTotal', undefined)
                if (value !== 'until') form.setValue('recurrenceUntil', undefined)
              }}
              value={field.value ?? 'infinite'}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="infinite" id={ids.infinite} />
                <Label htmlFor={ids.infinite} className="text-sm cursor-pointer">
                  Sem prazo (infinito)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="times" id={ids.times} />
                <Label htmlFor={ids.times} className="text-sm cursor-pointer">
                  Por X vezes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="until" id={ids.until} />
                <Label htmlFor={ids.until} className="text-sm cursor-pointer">
                  Até uma data
                </Label>
              </div>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
