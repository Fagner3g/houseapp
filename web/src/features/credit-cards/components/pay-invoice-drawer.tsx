import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getListStatementsQueryKey,
  useCreateTransaction,
  useListAccounts,
  useUpdateTransaction,
} from '@/api/generated/api'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import { calendarDateToIso } from '@/lib/date'
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
import { AccountSelect } from '@/features/accounts/components/account-select'
import { filterPaymentAccounts } from '@/features/accounts/constants'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsToNumber, reaisToMoneyString } from '@/lib/currency'
import {
  stackyDrawerContentNested,
  stackyDrawerCloseButton,
  stackyDrawerFooter,
  stackyDrawerHeader,
  stackyDrawerTitle,
} from '@/lib/ui-classes'
import { useDrawerStore } from '@/stores/drawers'

const payInvoiceSchema = z.object({
  title: z.string().min(1, 'Descrição obrigatória'),
  amount: z.number().positive('Informe um valor maior que zero'),
  date: z.string().min(1, 'Data obrigatória'),
  sourceAccountId: z.string().min(1, 'Selecione a conta de origem'),
})

type PayInvoiceFormValues = z.infer<typeof payInvoiceSchema>

export function PayInvoiceDrawer() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const open = useDrawerStore(s => s.payInvoiceDrawerOpen)
  const context = useDrawerStore(s => s.payInvoiceContext)
  const close = useDrawerStore(s => s.closePayInvoiceDrawer)
  const { mutateAsync: createTransaction, isPending } = useCreateTransaction()
  const { mutateAsync: updateTransaction } = useUpdateTransaction()

  const { data: accountsData } = useListAccounts(slug, {
    query: { enabled: !!slug && open },
  })

  const accounts = accountsData?.accounts ?? []

  const paymentAccounts = useMemo(
    () => filterPaymentAccounts(accounts),
    [accounts]
  )

  const creditCardAccount = useMemo(
    () => accountsData?.accounts?.find(a => a.id === context?.creditCardAccountId),
    [accountsData?.accounts, context?.creditCardAccountId]
  )

  const defaultSourceAccountId = useMemo(() => {
    if (!paymentAccounts.length) return ''
    const sameInstitution = paymentAccounts.find(
      a => a.institution && a.institution === creditCardAccount?.institution
    )
    return (sameInstitution ?? paymentAccounts[0]).id
  }, [paymentAccounts, creditCardAccount?.institution])

  const form = useForm<PayInvoiceFormValues>({
    resolver: zodResolver(payInvoiceSchema),
    defaultValues: {
      title: '',
      amount: 0,
      date: dayjs().format('YYYY-MM-DD'),
      sourceAccountId: '',
    },
  })

  useEffect(() => {
    if (!open || !context) return
    form.reset({
      title: `Pagamento Fatura ${context.creditCardName} - ${context.cycleLabel}`,
      amount: centsToNumber(context.amountCents),
      date: context.dueDate,
      sourceAccountId: defaultSourceAccountId,
    })
  }, [open, context, defaultSourceAccountId, form])

  const onSubmit = async (values: PayInvoiceFormValues) => {
    if (!slug || !context) return

    const submittedCents = Math.round(values.amount * 100)
    if (submittedCents > context.amountCents) {
      toast.error('Valor excede o restante da fatura')
      return
    }
    if (context.amountCents <= 0) {
      toast.error('Esta fatura já está quitada')
      close()
      return
    }

    try {
      const isoDate = calendarDateToIso(values.date)
      const amount = reaisToMoneyString(values.amount)

      const expense = await createTransaction({
        slug,
        data: {
          title: values.title,
          type: 'expense',
          amount,
          date: isoDate,
          accountId: values.sourceAccountId,
          status: 'paid',
          paidAt: isoDate,
          paidAmount: amount,
        },
      })

      const income = await createTransaction({
        slug,
        data: {
          title: values.title,
          type: 'income',
          amount,
          date: isoDate,
          accountId: context.creditCardAccountId,
          status: 'paid',
          paidAt: isoDate,
          paidAmount: amount,
          transferPairId: expense.transaction.id,
        },
      })

      await updateTransaction({
        slug,
        id: expense.transaction.id,
        data: { transferPairId: income.transaction.id },
      })

      await invalidateTransactionQueries(queryClient, slug)
      await queryClient.invalidateQueries({
        queryKey: getListStatementsQueryKey(slug, context.creditCardAccountId),
      })

      toast.success('Pagamento de fatura registrado')
      close()
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  if (!open || !context) {
    return null
  }

  return (
    <Drawer open={open} onOpenChange={v => !v && close()} direction="right">
      <DrawerContent className={stackyDrawerContentNested} onOverlayDismiss={close}>
        <DrawerHeader className={stackyDrawerHeader}>
          <div>
            <DrawerTitle className={stackyDrawerTitle}>Pagamento de Fatura</DrawerTitle>
            <p className="text-sm capitalize text-slate-500">{context.cycleLabel}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            className={stackyDrawerCloseButton}
            onClick={close}
          >
            <X className="size-5" />
          </button>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do pagamento</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de pagamento</FormLabel>
                    <FormControl>
                      <DatePickerInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pagamento a partir da conta</FormLabel>
                    <FormControl>
                      <AccountSelect
                        accounts={accounts}
                        value={field.value}
                        onValueChange={field.onChange}
                        paymentOnly
                        placeholder="Selecione a conta"
                      />
                    </FormControl>
                    <FormDescription>
                      O valor será debitado desta conta e entrará como crédito na fatura.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DrawerFooter className={stackyDrawerFooter}>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending || !paymentAccounts.length}>
                  Confirmar pagamento
                </Button>
              </div>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  )
}
