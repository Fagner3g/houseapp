import type { UseFormReturn } from 'react-hook-form'

import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { type NewTransactionSchema, RegisterType } from './schema'

export interface TypeProps {
  form: UseFormReturn<NewTransactionSchema>
  disabled?: boolean
}

export function TypeField({ form, disabled }: TypeProps) {
  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="relative inline-grid h-9 grid-cols-[1fr_1fr] items-center text-sm font-medium">
              <Switch
                checked={field.value !== RegisterType.EXPENSE}
                onCheckedChange={checked =>
                  field.onChange(checked ? RegisterType.INCOME : RegisterType.EXPENSE)
                }
                disabled={disabled}
                className="dark:data-[state=unchecked]:bg-red-500/70 dark:data-[state=checked]:bg-green-400/80 peer data-[state=unchecked]:bg-red-500 data-[state=checked]:bg-green-400 absolute inset-0 h-[inherit] w-auto [&_span]:z-10 [&_span]:h-full [&_span]:w-1/2 [&_span]:transition-transform [&_span]:duration-300 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:data-[state=checked]:translate-x-full [&_span]:data-[state=checked]:rtl:-translate-x-full"
              />
              <span className="peer-data-[state=checked]:text-black pointer-events-none relative ms-0.5 flex min-w-8 items-center justify-center text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=unchecked]:invisible peer-data-[state=checked]:translate-x-full peer-data-[state=checked]:rtl:-translate-x-full">
                <span className="peer-data-[state=unchecked]:-translate-x-full peer-data-[state=checked]:translate-x-0">
                  Receita
                </span>
              </span>
              <span className="peer-data-[state=unchecked]:text-white pointer-events-none relative me-0.5 flex min-w-8 items-center justify-center text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=unchecked]:-translate-x-full peer-data-[state=checked]:invisible peer-data-[state=unchecked]:rtl:translate-x-full">
                <span className="peer-data-[state=unchecked]:translate-x-0 peer-data-[state=checked]:-translate-x-full">
                  Despesa
                </span>
              </span>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
