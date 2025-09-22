import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  getListTransactionsQueryKey,
  useCreateTransaction,
  useListUsersByOrg,
} from '@/api/generated/api'
import type {
  CreateTransactionBody,
  ListTransactions200,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Form } from '@/components/ui/form'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useIsMobile } from '@/hooks/use-mobile'
import { showToastOnErrorSubmit } from '@/lib/utils'
import { AmountField } from './amount-field'
import { DescriptionField } from './description-field'
import { CalendarField } from './due-date-field'
import { InstallmentsTotalField } from './installments-total-field'
import { RecurrenceField } from './is-recurring-filed'
import { PayToField } from './pay-to-field'
import { RecurrenceSelectorField } from './recurrence-selector-field'
import { RecurrenceTypeField } from './recurrence-type-field'
import { RecurrenceUntilField } from './recurrence-until-field'
import { type NewTransactionSchema, newTransactionSchema, RegisterType } from './schema'
import { TagField } from './tag-field'
import { TitleField } from './title-filed'
import { TypeField } from './type-field'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: ListTransactions200TransactionsItem | null
}

export function DrawerNewTransaction({ open, onOpenChange, transaction }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { data: userData } = useListUsersByOrg(slug)
  const isMobile = useIsMobile()

  const form = useForm<NewTransactionSchema>({
    resolver: zodResolver(newTransactionSchema),
    defaultValues: {
      type: RegisterType.EXPENSE,
      isRecurring: false,
      recurrenceSelector: undefined,
      recurrenceType: undefined,
      recurrenceUntil: undefined,
      recurrenceInterval: undefined,
      installmentsTotal: undefined,
      recurrenceStart: undefined,
    },
  })

  const { mutate: createTransaction } = useCreateTransaction({
    mutation: {
      // roda ANTES do request
      onMutate: async ({ slug, data }) => {
        await queryClient.cancelQueries({ queryKey: getListTransactionsQueryKey(slug) })

        const previous = queryClient.getQueryData(getListTransactionsQueryKey(slug))

        queryClient.setQueryData(getListTransactionsQueryKey(slug), (olds: ListTransactions200) => {
          const list = olds?.transactions ?? []

          const optimistic: CreateTransactionBody & { id: string } = {
            ...data,
            id: `optimistic-${Date.now()}`,
          }

          const resp = {
            ...(olds ?? { transactions: [] as ListTransactions200TransactionsItem[] }),
            transactions: [...list, optimistic],
          }
          return resp
        })

        const toastCtx = toast.loading('Criando transação...')
        return { previous, slug, toastCtx }
      },
      onSuccess: (_, _vars, ctx) => {
        if (ctx) {
          toast.dismiss(ctx.toastCtx)
        }
        toast.success('Transação criada com sucesso!')
      },
      onError: (_err, _vars, ctx) => {
        if (ctx) {
          queryClient.setQueryData(getListTransactionsQueryKey(ctx.slug), ctx.previous)
          toast.dismiss(ctx.toastCtx)
        }
        toast.error('Erro ao criar transação')
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
      },
    },
  })

  const isExpense = form.watch('type') === RegisterType.EXPENSE
  const isRecurring = form.watch('isRecurring')
  const mode = form.getValues('recurrenceSelector')
  const dueDate = form.watch('dueDate')

  useEffect(() => {
    if (!isRecurring) return

    // aguarda o próximo tick para garantir que os campos condicionais já registraram
    queueMicrotask(() => {
      form.setValue('recurrenceType', 'monthly', { shouldValidate: true, shouldTouch: true })
      form.setValue('recurrenceSelector', 'repeat', { shouldValidate: true, shouldTouch: true })
      form.setValue('recurrenceInterval', 1, { shouldValidate: true, shouldTouch: true })
    })
  }, [isRecurring, form])

  useEffect(() => {
    if (!isRecurring) return

    queueMicrotask(() => {
      form.setValue('recurrenceStart', dueDate, { shouldValidate: true, shouldTouch: true })
    })
  }, [isRecurring, dueDate, form])

  useEffect(() => {
    // inicializa valores padrão se vazio
    queueMicrotask(() => {
      if (mode === 'repeat') {
        form.setValue('installmentsTotal', 1, { shouldValidate: true, shouldTouch: true })
      } else {
        form.setValue('installmentsTotal', undefined, { shouldValidate: true, shouldTouch: true })
      }
    })
  }, [form, mode])

  useEffect(() => {
    if (!open) return

    if (transaction) {
      const payToEmail = userData?.users.find(user => user.name === transaction.payTo)?.email

      form.reset({
        type: transaction.type,
        title: transaction.title,
        amount: transaction.amount,
        dueDate: new Date(transaction.dueDate),
        payToEmail,
        tags: transaction.tags,
        description: undefined,
        isRecurring: false,
        recurrenceSelector: undefined,
        recurrenceType: undefined,
        recurrenceUntil: undefined,
        recurrenceInterval: undefined,
        installmentsTotal: undefined,
        recurrenceStart: undefined,
      })
    } else {
      form.reset({
        type: RegisterType.EXPENSE,
        isRecurring: false,
        recurrenceSelector: undefined,
        recurrenceType: undefined,
        recurrenceUntil: undefined,
        recurrenceInterval: undefined,
        installmentsTotal: undefined,
        recurrenceStart: undefined,
      })
    }
  }, [open, transaction, userData, form])

  async function handleSubmit(data: NewTransactionSchema) {
    createTransaction({ slug, data: { ...data, amount: data.amount } })
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Criar nova {isExpense ? 'Receita' : 'Despesa'}</DrawerTitle>
          <DrawerDescription>
            Crie um nova {isExpense ? 'receita' : 'despesa'} e defina os detalhes.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit, () => showToastOnErrorSubmit({ form }))}
              className="flex flex-col gap-4"
            >
              <TypeField form={form} />
              <TitleField form={form} />
              <div className="flex flex-col gap-5 sm:flex-row">
                <AmountField form={form} />
                <CalendarField form={form} />
              </div>
              <div className="flex flex-col gap-5 sm:flex-row">
                <PayToField form={form} data={userData} />
                <RecurrenceField form={form} />
              </div>

              {form.watch('isRecurring') && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <RecurrenceTypeField form={form} />
                  <RecurrenceSelectorField form={form} />
                  {form.watch('recurrenceSelector') === 'date' ? (
                    <RecurrenceUntilField form={form} />
                  ) : (
                    <InstallmentsTotalField form={form} />
                  )}
                </div>
              )}

              <TagField form={form} />

              <DescriptionField form={form} />
              <Button type="submit">Cadastrar</Button>
            </form>
          </Form>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
