import { Minus, Plus } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form'
import type { NewTransactionSchema } from './schema'

interface RecurrenceIntervalFieldProps {
  form: UseFormReturn<NewTransactionSchema>
}

export function RecurrenceIntervalField({ form }: RecurrenceIntervalFieldProps) {
  const type = form.watch('recurrenceType')
  const unit = type === 'weekly' ? 'semana(s)' : type === 'yearly' ? 'ano(s)' : 'mês(es)'
  const enabled = Boolean(type)
  const hasError = Boolean(form.formState.errors.recurrenceInterval)

  return (
    <FormField
      control={form.control}
      name="recurrenceInterval"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Intervalo</FormLabel>
          <FormControl>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                disabled={!enabled}
                onClick={() => {
                  const current = Number.isFinite(field.value as number) ? Number(field.value) : 1
                  const next = Math.max(1, current - 1)
                  field.onChange(next)
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="1"
                className={`h-9 flex-1 rounded-md border bg-background px-3 py-1 text-sm ${hasError ? 'border-destructive ring-1 ring-destructive/50' : ''}`}
                value={field.value ?? ''}
                disabled={!enabled}
                onChange={e => {
                  const v = e.target.value
                  field.onChange(v === '' ? undefined : Number.parseInt(v, 10))
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                disabled={!enabled}
                onClick={() => {
                  const current = Number.isFinite(field.value as number) ? Number(field.value) : 1
                  field.onChange(current + 1)
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormControl>
          <FormDescription className="text-xs">
            {enabled
              ? `A cada ${unit}. Ex.: 1 = todo ${unit.replace('(s)', '')}; 2 = a cada 2 ${unit}.`
              : 'Escolha a recorrência primeiro.'}
          </FormDescription>
        </FormItem>
      )}
    />
  )
}
