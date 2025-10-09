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
import { ModalNewUser } from '../modal-new-user'
import type { NewTransactionSchema } from './schema'

export interface PayToFieldProps {
  form: UseFormReturn<NewTransactionSchema>
  data: ListUsersByOrg200 | undefined
  disabled?: boolean
}

export function PayToField({ form, data, disabled }: PayToFieldProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <FormField
      control={form.control}
      name="payToEmail"
      render={({ field }) => (
        <FormItem className="flex-1/6">
          <FormLabel className="flex items-center gap-1">
            {form.getValues('type') !== 'expense' ? 'Pagar para' : 'Receber de'}
          </FormLabel>
          <FormControl>
            <Popover open={open} onOpenChange={setOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-expanded={open}
                  className={cn(
                    'flex justify-between w-full h-9 px-3',
                    !field.value && 'text-muted-foreground',
                    form.formState.errors.payToEmail &&
                      'border-destructive dark:border-destructive ring-1 ring-destructive/50'
                  )}
                  aria-invalid={!!form.formState.errors.payToEmail}
                  disabled={disabled}
                >
                  {field.value
                    ? data?.users.find(user => user.email === field.value)?.name
                    : 'Selecione'}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-[190] w-[320px] p-0 max-h-[360px] overflow-auto pointer-events-auto"
                onWheel={e => e.stopPropagation()}
              >
                <Command className="max-h-[300px]">
                  <CommandInput
                    placeholder="Pesquise o usuário..."
                    className="h-10 border-0 focus:ring-0"
                  />
                  <CommandList
                    className="max-h-[280px] overflow-auto"
                    onWheel={e => e.stopPropagation()}
                  >
                    <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado
                    </CommandEmpty>
                    <CommandGroup>
                      {data?.users.map(user => (
                        <CommandItem
                          key={user.email}
                          value={user.email}
                          onSelect={currentValue => {
                            field.onChange(currentValue)
                            setOpen(false)
                          }}
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                              {(user as { avatar?: string }).avatar ? (
                                <img
                                  src={(user as { avatar?: string }).avatar as string}
                                  alt={user.name}
                                  className="h-full w-full object-cover rounded-full"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-primary">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                          <Check
                            className={cn(
                              'h-4 w-4',
                              field.value === user.email ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  <Separator />
                  <div className="p-2">
                    <ModalNewUser />
                  </div>
                </Command>
              </PopoverContent>
            </Popover>
          </FormControl>
        </FormItem>
      )}
    />
  )
}
