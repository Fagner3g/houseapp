import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'

import type { GetRecurringTransaction200RecurringTransaction } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerInput } from '@/components/ui/date-picker-field'
import { DrawerFooter } from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { CategorySelect } from '@/features/categories/components/category-select'
import {
  RECURRING_DURATION_OPTIONS,
  TRANSACTION_PERIODICITY_OPTIONS,
} from '@/features/transactions/constants'
import { cn } from '@/lib/utils'
import {
  stackyDrawerFooter,
  stackyDrawerFormItem,
  stackyDrawerFormRow,
  stackySelectItem,
  stackySelectTrigger,
} from '@/lib/ui-classes'

import {
  contractSchema,
  mapRecurringToFormValues,
  type ContractFormValues,
} from '../lib/recurring-contract-form'

type AccountOption = {
  id: string
  name: string
  type: string
  institution?: string | null
  color?: string | null
  icon?: string | null
}

type RecurringContractFormProps = {
  recurring: GetRecurringTransaction200RecurringTransaction
  accounts: AccountOption[]
  isPending: boolean
  onSubmit: (values: ContractFormValues) => void | Promise<void>
}

export function RecurringContractForm({
  recurring,
  accounts,
  isPending,
  onSubmit,
}: RecurringContractFormProps) {
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    // Mount with server data so Selects hydrate with the correct label.
    defaultValues: mapRecurringToFormValues(recurring),
  })

  const recurringDuration = form.watch('recurringDuration')

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(values => onSubmit(values))}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Tipo</span>
              <span className="font-medium text-slate-900">
                {recurring.type === 'income' ? 'Receita' : 'Despesa'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Início do contrato</span>
              <span className="font-medium text-slate-900">
                {dayjs(recurring.startDate).format('DD/MM/YYYY')}
              </span>
            </div>
          </div>

          <div className={stackyDrawerFormRow}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-12')}>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="counterparty"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-12')}>
                  <FormLabel>Empresa / contraparte</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Empresa empregadora" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-12')}>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onValueChange={field.onChange}
                      allowEmpty
                      placeholder="Opcional"
                    />
                  </FormControl>
                  <FormDescription>
                    Deixe em branco se ainda não souber o valor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodicity"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-6')}>
                  <FormLabel>Periodicidade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={stackySelectTrigger}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRANSACTION_PERIODICITY_OPTIONS.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className={stackySelectItem}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recurringDuration"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-6')}>
                  <FormLabel>Duração</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={stackySelectTrigger}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RECURRING_DURATION_OPTIONS.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className={stackySelectItem}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recurringDuration === 'times' && (
              <FormField
                control={form.control}
                name="recurringRepetitions"
                render={({ field }) => (
                  <FormItem className={cn(stackyDrawerFormItem, 'col-span-6')}>
                    <FormLabel>Repetições</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {recurringDuration === 'until' && (
              <FormField
                control={form.control}
                name="recurringEndDate"
                render={({ field }) => (
                  <FormItem className={cn(stackyDrawerFormItem, 'col-span-6')}>
                    <FormLabel>Data final</FormLabel>
                    <FormControl>
                      <DatePickerInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-6')}>
                  <FormLabel>Conta</FormLabel>
                  <FormControl>
                    <AccountSelect
                      accounts={accounts}
                      value={field.value}
                      onValueChange={field.onChange}
                      paymentOnly
                      instanceKey={`recurring-contract-${recurring.id}`}
                      className={stackySelectTrigger}
                      itemClassName={stackySelectItem}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className={cn(stackyDrawerFormItem, 'col-span-6')}>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <CategorySelect
                      value={field.value || undefined}
                      type={recurring.type}
                      onChange={categoryId => field.onChange(categoryId ?? '')}
                      instanceKey={`recurring-contract-category-${recurring.id}`}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <DrawerFooter className={stackyDrawerFooter}>
          <Button type="submit" disabled={isPending} className="w-full">
            Salvar alterações
          </Button>
        </DrawerFooter>
      </form>
    </Form>
  )
}
