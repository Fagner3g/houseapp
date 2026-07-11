import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getGetRecurringTransactionQueryKey,
  getListRecurringTransactionsQueryKey,
  useGetRecurringTransaction,
  usePreviewUpdateRecurringTransaction,
  useUpdateRecurringTransaction,
  useListAccounts,
} from '@/api/generated/api'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import { calendarDateToIso } from '@/lib/date'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerInput } from '@/components/ui/date-picker-field'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
  formatTransactionPeriodicity,
  parseTransactionPeriodicity,
  RECURRING_DURATION_OPTIONS,
  TRANSACTION_PERIODICITY_OPTIONS,
} from '@/features/transactions/constants'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { apiAmountToFormReais, formatCurrency, optionalReaisToApiAmount } from '@/lib/currency'
import {
  stackyDrawerCloseButton,
  stackyDrawerContent,
  stackyDrawerFooter,
  stackyDrawerHeader,
  stackyDrawerTitle,
  stackySelectItem,
  stackySelectTrigger,
} from '@/lib/ui-classes'
import { useDrawerStore } from '@/stores/drawers'

const contractSchema = z
  .object({
    title: z.string().min(1, 'Descrição obrigatória'),
    counterparty: z.string().optional(),
    amount: z.number().nullable(),
    accountId: z.string().min(1, 'Selecione uma conta'),
    categoryId: z.string().optional(),
    periodicity: z.string(),
    recurringDuration: z.enum(['infinite', 'times', 'until']),
    recurringRepetitions: z.coerce.number().int().min(1).optional(),
    recurringEndDate: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.recurringDuration === 'times' && !values.recurringRepetitions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o número de repetições',
        path: ['recurringRepetitions'],
      })
    }
    if (values.recurringDuration === 'until' && !values.recurringEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a data final',
        path: ['recurringEndDate'],
      })
    }
  })

type ContractFormValues = z.infer<typeof contractSchema>

export function RecurringContractDrawer() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const open = useDrawerStore(s => s.recurringContractDrawerOpen)
  const recurringId = useDrawerStore(s => s.editingRecurringId)
  const close = useDrawerStore(s => s.closeRecurringContractDrawer)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<ContractFormValues | null>(null)
  const [impactPreview, setImpactPreview] = useState<{
    preservedPastCount: number
    updatedFuturePendingCount: number
    currentAmount: string
    proposedAmount: string
    typeLabel: string
  } | null>(null)

  const { data: recurringData, isLoading } = useGetRecurringTransaction(slug, recurringId ?? '', {
    query: { enabled: !!slug && !!recurringId && open },
  })
  const { data: accountsData } = useListAccounts(slug, { query: { enabled: !!slug && open } })

  const { mutateAsync: previewUpdate, isPending: isPreviewing } =
    usePreviewUpdateRecurringTransaction()
  const { mutateAsync: updateRecurring, isPending: isUpdating } = useUpdateRecurringTransaction()

  const recurring = recurringData?.recurringTransaction

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      title: '',
      counterparty: '',
      amount: null,
      accountId: '',
      categoryId: '',
      periodicity: 'monthly-1',
      recurringDuration: 'infinite',
      recurringRepetitions: 2,
      recurringEndDate: dayjs().format('YYYY-MM-DD'),
    },
  })

  const recurringDuration = form.watch('recurringDuration')

  useEffect(() => {
    if (!open || !recurring) return

    const duration = recurring.installmentsTotal
      ? 'times'
      : recurring.endDate
        ? 'until'
        : 'infinite'

    form.reset({
      title: recurring.title,
      counterparty: recurring.counterparty ?? '',
      amount: apiAmountToFormReais(recurring.amount),
      accountId: recurring.accountId ?? '',
      categoryId: recurring.categoryId ?? '',
      periodicity: formatTransactionPeriodicity(recurring.frequency, recurring.interval),
      recurringDuration: duration,
      recurringRepetitions: recurring.installmentsTotal ?? 2,
      recurringEndDate: recurring.endDate
        ? dayjs(recurring.endDate).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
    })
  }, [open, recurring, form])

  const typeLabel = useMemo(() => {
    if (!recurring) return 'recebimentos'
    return recurring.type === 'income' ? 'recebimentos' : 'pagamentos'
  }, [recurring])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListRecurringTransactionsQueryKey(slug) })
    void invalidateTransactionQueries(queryClient, slug)
    if (recurringId) {
      queryClient.invalidateQueries({
        queryKey: getGetRecurringTransactionQueryKey(slug, recurringId),
      })
    }
  }

  const buildApiPayload = (values: ContractFormValues) => {
    const { frequency, interval } = parseTransactionPeriodicity(values.periodicity)
    return {
      title: values.title,
      // Recurring template amount is NOT NULL in DB; use 0 as reminder-without-value.
      amount: optionalReaisToApiAmount(values.amount) ?? '0.00',
      counterparty: values.counterparty?.trim() ? values.counterparty.trim() : null,
      accountId: values.accountId,
      categoryId: values.categoryId || null,
      frequency,
      interval,
      installmentsTotal:
        values.recurringDuration === 'times' ? values.recurringRepetitions ?? null : null,
      endDate:
        values.recurringDuration === 'until' && values.recurringEndDate
          ? calendarDateToIso(values.recurringEndDate)
          : values.recurringDuration === 'until'
            ? null
            : null,
      effectiveFrom: calendarDateToIso(dayjs().format('YYYY-MM-DD')),
    }
  }

  const handleSave = form.handleSubmit(async values => {
    if (!slug || !recurringId || !recurring) return

    const payload = buildApiPayload(values)
    const preview = await previewUpdate({ slug, id: recurringId, data: payload })

    setPendingPayload(values)
    setImpactPreview({
      preservedPastCount: preview.impact.preservedPastCount,
      updatedFuturePendingCount: preview.impact.updatedFuturePendingCount,
      currentAmount: preview.current.amount,
      proposedAmount: preview.proposed.amount,
      typeLabel,
    })
    setConfirmOpen(true)
  })

  const handleConfirm = async () => {
    if (!slug || !recurringId || !pendingPayload) return

    await updateRecurring({
      slug,
      id: recurringId,
      data: buildApiPayload(pendingPayload),
    })

    toast.success('Contrato recorrente atualizado')
    invalidateAll()
    setConfirmOpen(false)
    setPendingPayload(null)
    setImpactPreview(null)
    close()
  }

  const isPending = isPreviewing || isUpdating

  return (
    <>
      <Drawer open={open} onOpenChange={next => !next && close()}>
        <DrawerContent className={stackyDrawerContent}>
          <DrawerHeader className={stackyDrawerHeader}>
            <DrawerTitle className={stackyDrawerTitle}>Contrato recorrente</DrawerTitle>
            <button type="button" className={stackyDrawerCloseButton} onClick={close}>
              <X className="size-4" />
            </button>
          </DrawerHeader>

          {isLoading || !recurring ? (
            <div className="px-4 py-8 text-sm text-slate-500">Carregando contrato...</div>
          ) : (
            <Form {...form}>
              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-4 overflow-y-auto px-4 pb-4">
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
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

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
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
                      <FormItem>
                        <FormLabel>Empresa / contraparte</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Empresa empregadora" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              value={field.value}
                              onValueChange={field.onChange}
                              allowEmpty
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
                        <FormItem>
                          <FormLabel>Periodicidade</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className={stackySelectTrigger}>
                                <SelectValue />
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
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <AccountSelect
                            accounts={accountsData?.accounts ?? []}
                            value={field.value}
                            onValueChange={field.onChange}
                            paymentOnly
                            instanceKey={`recurring-contract-${recurringId}`}
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
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <CategorySelect
                            value={field.value}
                            type={recurring.type}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurringDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={stackySelectTrigger}>
                              <SelectValue />
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
                      </FormItem>
                    )}
                  />

                  {recurringDuration === 'times' && (
                    <FormField
                      control={form.control}
                      name="recurringRepetitions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repetições</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
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
                        <FormItem>
                          <FormLabel>Data final</FormLabel>
                          <FormControl>
                            <DatePickerInput value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <DrawerFooter className={stackyDrawerFooter}>
                  <Button type="submit" disabled={isPending} className="w-full">
                    Salvar alterações
                  </Button>
                </DrawerFooter>
              </form>
            </Form>
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração do contrato</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                {impactPreview && (
                  <>
                    <p>
                      O histórico de{' '}
                      <strong>{impactPreview.preservedPastCount}</strong> {typeLabel} passados/pagos
                      não será alterado.
                    </p>
                    {impactPreview.updatedFuturePendingCount > 0 && (
                      <p>
                        <strong>{impactPreview.updatedFuturePendingCount}</strong> {typeLabel}{' '}
                        pendentes futuros passarão de{' '}
                        {formatCurrency(centsStringToNumber(impactPreview.currentAmount))} para{' '}
                        {formatCurrency(centsStringToNumber(impactPreview.proposedAmount))}.
                      </p>
                    )}
                    {impactPreview.updatedFuturePendingCount === 0 && (
                      <p>Nenhum lançamento pendente futuro será alterado.</p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirm()} disabled={isUpdating}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
