import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { ListUsersByOrg200 } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ModalNewUser } from '../../../../../../components/modal-new-user'
import type { NewTransactionSchema } from './schema'

export interface PayToFieldProps {
  form: UseFormReturn<NewTransactionSchema>
  data: ListUsersByOrg200 | undefined
}

export function PayToField({ form, data }: PayToFieldProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <FormField
      control={form.control}
      name="payToEmail"
      render={({ field }) => (
        <FormItem className="flex-1/6">
          <FormLabel>
            {form.getValues('type') !== 'expense' ? 'Pagar para' : 'Receber de'}
          </FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-expanded={open}
                  className={cn('flex justify-between', !field.value && 'text-muted-foreground')}
                  aria-invalid={!!form.formState.errors.payToEmail}
                >
                  {field.value
                    ? data?.users.find(user => user.email === field.value)?.name
                    : 'Selecione'}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[90] w-[200px] p-0 verflow-hidden pointer-events-auto">
                <Command>
                  <CommandInput placeholder="Pesquise o usuário..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado</CommandEmpty>
                    <CommandGroup>
                      {data?.users.map(user => (
                        <CommandItem
                          key={user.email}
                          value={user.email}
                          onSelect={currentValue => {
                            field.onChange(currentValue)
                            setOpen(false)
                          }}
                        >
                          {user.name}
                          <Check
                            className={cn(
                              'ml-auto',
                              field.value === user.email ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  <Separator />
                  <ModalNewUser />
                </Command>
              </PopoverContent>
            </Popover>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
