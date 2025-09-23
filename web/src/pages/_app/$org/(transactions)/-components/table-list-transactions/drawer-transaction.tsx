import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  getGetOrgSlugReportsTransactionsQueryKey,
  getListTransactionsQueryKey,
  useCreateTransaction,
  useListUsersByOrg,
  useUpdateTransaction,
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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Form } from '@/components/ui/form'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useIsMobile } from '@/hooks/use-mobile'
import { showToastOnErrorSubmit } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { AmountField } from '../modal-new-transaction/amount-field'
import { DescriptionField } from '../modal-new-transaction/description-field'
import { CalendarField } from '../modal-new-transaction/due-date-field'
import { InstallmentsTotalField } from '../modal-new-transaction/installments-total-field'
import { RecurrenceField } from '../modal-new-transaction/is-recurring-filed'
import { PayToField } from '../modal-new-transaction/pay-to-field'
import { RecurrenceSelectorField } from '../modal-new-transaction/recurrence-selector-field'
import { RecurrenceTypeField } from '../modal-new-transaction/recurrence-type-field'
import { RecurrenceUntilField } from '../modal-new-transaction/recurrence-until-field'
import {
  type NewTransactionSchema,
  newTransactionSchema,
  RegisterType,
} from '../modal-new-transaction/schema'
import { TagField } from '../modal-new-transaction/tag-field'
import { TitleField } from '../modal-new-transaction/title-filed'
import { TypeField } from '../modal-new-transaction/type-field'
import { PaymentDateDialog } from './payment-date-dialog'
import { TransactionSummary } from './transaction-summary'

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DrawerTransaction({ transaction, open, onOpenChange }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { data: userData } = useListUsersByOrg(slug)
  const currentUser = useAuthStore(s => s.user)
  const isMobile = useIsMobile()
  const [hasChanges, setHasChanges] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const isEditMode = !!transaction
  const isOwner = currentUser?.id === transaction?.ownerId
  const isReadOnly = isEditMode && !isOwner

  const form = useForm<NewTransactionSchema>({
    resolver: zodResolver(newTransactionSchema),
    shouldUnregister: true,
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
        onOpenChange(false)
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

  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction({
    mutation: {
      onSuccess: () => {
        toast.success('Transação atualizada com sucesso!')
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        queryClient.invalidateQueries({
          queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
        })
        onOpenChange(false)
      },
      onError: () => toast.error('Erro ao atualizar transação'),
    },
  })

  const isExpense = form.watch('type') === RegisterType.EXPENSE
  const isRecurring = form.watch('isRecurring')
  const mode = form.getValues('recurrenceSelector')
  const dueDate = form.watch('dueDate')

  // Effects for recurrence handling (only in create mode)
  useEffect(() => {
    if (!isRecurring || isEditMode) return

    queueMicrotask(() => {
      form.setValue('recurrenceType', 'monthly', { shouldValidate: true, shouldTouch: true })
      form.setValue('recurrenceSelector', 'repeat', { shouldValidate: true, shouldTouch: true })
      form.setValue('recurrenceInterval', 1, { shouldValidate: true, shouldTouch: true })
    })
  }, [isRecurring, form, isEditMode])

  useEffect(() => {
    if (!isRecurring || isEditMode) return

    queueMicrotask(() => {
      form.setValue('recurrenceStart', dueDate, { shouldValidate: true, shouldTouch: true })
    })
  }, [isRecurring, dueDate, form, isEditMode])

  useEffect(() => {
    if (isEditMode) return

    queueMicrotask(() => {
      if (mode === 'repeat') {
        form.setValue('installmentsTotal', 1, { shouldValidate: true, shouldTouch: true })
      } else {
        form.setValue('installmentsTotal', undefined, { shouldValidate: true, shouldTouch: true })
      }
    })
  }, [form, mode, isEditMode])

  // When turning off recurrence in create mode, fully clear related fields and errors
  useEffect(() => {
    if (isEditMode) return
    if (isRecurring) return
    queueMicrotask(() => {
      const fields: Array<keyof NewTransactionSchema> = [
        'recurrenceSelector',
        'recurrenceType',
        'recurrenceUntil',
        'recurrenceInterval',
        'installmentsTotal',
        'recurrenceStart',
      ]
      fields.forEach(name => {
        form.resetField(name, {
          defaultValue: undefined,
          keepDirty: false,
          keepTouched: false,
          keepError: false,
        })
      })
      form.clearErrors(fields)
      form.unregister(fields)
      form.trigger()
    })
  }, [isRecurring, form, isEditMode])

  // Reset form when drawer opens
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
        description: transaction.description || '',
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
    setHasChanges(false)
  }, [open, transaction, userData, form])

  // Monitor form changes (only in edit mode)
  useEffect(() => {
    if (!isEditMode) return

    const subscription = form.watch(() => {
      setHasChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form, isEditMode])

  async function handleSubmit(data: NewTransactionSchema) {
    if (isEditMode && transaction) {
      updateTransaction({
        slug,
        id: transaction.id,
        data: {
          type: data.type,
          title: data.title,
          amount: data.amount,
          dueDate: data.dueDate.toISOString(),
          tags: data.tags,
          description: data.description,
          serieId: transaction.serieId,
        },
      })
    } else {
      createTransaction({ slug, data: { ...data, amount: data.amount } })
    }
  }

  function handleMainAction() {
    if (isEditMode && hasChanges) {
      // Save changes
      form.handleSubmit(handleSubmit)()
    } else if (isEditMode) {
      // Open payment dialog
      setPaymentDialogOpen(true)
    } else {
      // Create new transaction
      form.handleSubmit(handleSubmit)()
    }
  }

  const getTitle = () => {
    if (isEditMode) {
      return isReadOnly ? 'Visualizar transação' : 'Editar transação'
    }
    return `Criar nova ${isExpense ? 'Despesa' : 'Receita'}`
  }

  const getDescription = () => {
    if (isEditMode) {
      return transaction?.title
    }
    return `Crie um nova ${isExpense ? 'despesa' : 'receita'} e defina os detalhes.`
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
        <DrawerContent
          className={
            isMobile
              ? 'h-[100vh] w-full [&[data-vaul-drawer-direction=bottom]]:!max-h-[100vh] [&[data-vaul-drawer-direction=bottom]]:!h-[100vh]'
              : 'h-full w-[450px] max-w-[90vw] [&[data-vaul-drawer-direction=right]]:!max-h-[100vh] [&[data-vaul-drawer-direction=right]]:!h-[100vh]'
          }
          style={{
            maxHeight: '100vh',
            height: isMobile ? '100vh' : '100vh',
            width: isMobile ? '100%' : '450px',
            maxWidth: isMobile ? 'none' : '90vw',
          }}
        >
          <DrawerHeader className="pb-4 border-b">
            <DrawerTitle className="text-lg font-semibold">{getTitle()}</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{getDescription()}</p>
          </DrawerHeader>

          <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}>
            <div className={isMobile ? 'max-w-2xl mx-auto' : 'w-full'}>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit, errors =>
                    showToastOnErrorSubmit({ form, errors })
                  )}
                  className={isMobile ? 'space-y-6' : 'space-y-4'}
                >
                  <div className="space-y-4">
                    <TypeField form={form} disabled={isReadOnly} />
                    <TitleField form={form} disabled={isReadOnly} />
                    <AmountField form={form} disabled={isReadOnly} />
                    <CalendarField form={form} disabled={isReadOnly} />
                    <PayToField form={form} data={userData} disabled={isReadOnly} />
                    {!isEditMode && <RecurrenceField form={form} />}
                  </div>

                  {!isEditMode && form.watch('isRecurring') && (
                    <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Configuração de Recorrência
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RecurrenceTypeField form={form} />
                        <RecurrenceSelectorField form={form} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {form.watch('recurrenceSelector') === 'date' ? (
                          <RecurrenceUntilField form={form} />
                        ) : (
                          <InstallmentsTotalField form={form} />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <TagField form={form} disabled={isReadOnly} />
                    <DescriptionField form={form} disabled={isReadOnly} />
                  </div>
                </form>
              </Form>

              {/* Resumo da transação (apenas no modo editar) */}
              {isEditMode && (
                <div className="mt-8 pt-6 border-t">
                  <TransactionSummary
                    transaction={transaction}
                    onDelete={() => onOpenChange(false)}
                  />
                </div>
              )}
            </div>
          </div>

          <DrawerFooter className="pt-4 border-t bg-muted/30">
            <div className={isMobile ? 'max-w-2xl mx-auto w-full' : 'w-full'}>
              <div className="flex flex-row gap-3">
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1 h-11">
                    {isEditMode && isReadOnly ? 'Fechar' : 'Cancelar'}
                  </Button>
                </DrawerClose>
                {(!isEditMode || !isReadOnly) && (
                  <Button
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleMainAction()
                    }}
                    disabled={isUpdating}
                    className="flex-1 h-11"
                    variant={
                      isEditMode && hasChanges
                        ? 'default'
                        : isEditMode && transaction?.status === 'paid'
                          ? 'outline'
                          : 'default'
                    }
                  >
                    {isUpdating
                      ? 'Processando...'
                      : isEditMode
                        ? hasChanges
                          ? 'Salvar Edição'
                          : transaction?.status === 'paid'
                            ? 'Cancelar Pagamento'
                            : 'Marcar como Pago'
                        : 'Cadastrar'}
                  </Button>
                )}
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Payment dialog (apenas no modo editar) */}
      {isEditMode && (
        <PaymentDateDialog
          transaction={transaction}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onSuccess={() => {
            if (transaction?.status !== 'paid') {
              onOpenChange(false)
            }
          }}
        />
      )}
    </>
  )
}
