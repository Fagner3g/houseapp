import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  getGetOrgSlugReportsTransactionsQueryKey,
  getGetTransactionInstallmentsQueryKey,
  getListTransactionsQueryKey,
  useCreateTransaction,
  useGetTransactionInstallments,
  useListUsersByOrg,
  usePayTransaction,
  useUpdateTransaction,
} from '@/api/generated/api'
import type {
  CreateTransactionBody,
  ListTransactions200,
  ListTransactions200TransactionsItem,
  UpdateTransactionBody,
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
import { useScrollToActiveField } from '@/hooks/use-scroll-to-active-field'
import { useVirtualKeyboard } from '@/hooks/use-virtual-keyboard'
import { showToastOnErrorSubmit } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { PaymentDateDialog } from '../../pages/_app/$org/(transactions)/-components/table-list-transactions/payment-date-dialog'
import { TransactionSummary } from '../../pages/_app/$org/(transactions)/-components/table-list-transactions/transaction-summary'
import { AmountField } from './amount-field'
import { DescriptionField } from './description-field'
import { CalendarField } from './due-date-field'
import { InstallmentsTotalField } from './installments-total-field'
import { RecurrenceField } from './is-recurring-filed'
import { PayToField } from './pay-to-field'
import { RecurrenceSelectorField } from './recurrence-selector-field'
import { RecurrenceTypeField } from './recurrence-type-field'
import { RecurrenceUntilField } from './recurrence-until-field'
import { getDrawerContext } from './row-mapper'
import { type NewTransactionSchema, newTransactionSchema, RegisterType } from './schema'
import { TagField } from './tag-field'
import { TitleField } from './title-filed'
import { TypeField } from './type-field'

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExternalSubmit?: (args: {
    slug: string
    id: string
    data: UpdateTransactionBody
  }) => Promise<void> | void
}

export function DrawerTransaction({ transaction, open, onOpenChange, onExternalSubmit }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const isMobile = useIsMobile()
  const { slug } = useActiveOrganization()
  const { data: userData } = useListUsersByOrg(slug)
  const { isKeyboardOpen, keyboardHeight } = useVirtualKeyboard()
  const scrollContainerRef = useScrollToActiveField(isKeyboardOpen)

  // Buscar installments quando o drawer estiver aberto e houver uma transação
  const serieId = transaction?.serieId || ''
  const { refetch: refetchInstallments } = useGetTransactionInstallments(slug, serieId, {
    query: {
      enabled: Boolean(open && transaction && serieId),
      staleTime: 0, // Sempre buscar dados frescos
      refetchOnWindowFocus: false,
    },
  })
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const initializedTransactionRef = useRef<string | null>(null)
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
  // Serializar dados da transação com cálculos derivados
  const labels = getDrawerContext(transaction, currentUser?.id)
  const { isEditMode, isPaid, isReadOnly, title: baseTitle, description: baseDescription } = labels

  // Usar form.getValues() em vez de form.watch() para evitar re-renders
  const formType = form.getValues('type')
  const isExpense = formType === RegisterType.EXPENSE

  // Estado local para controlar isDirty - mais confiável que form.formState.isDirty
  const [isDirty, setIsDirty] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Detectar mudanças reais no form
  useEffect(() => {
    if (!transaction || !isEditMode) {
      setIsDirty(false)
      return
    }

    const subscription = form.watch((_, { name, type }) => {
      // Ignorar mudanças durante o reset
      if (isResetting) {
        return
      }

      // Só considerar como mudança se não for o reset inicial
      if (type === 'change' && name) {
        setIsDirty(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, transaction, isEditMode, isResetting])

  // Preencher formulário quando a transação mudar
  useEffect(() => {
    if (!open) return

    const currentTransactionId = transaction?.id || 'new'

    // Só resetar se a transação mudou
    if (initializedTransactionRef.current !== currentTransactionId) {
      if (transaction) {
        const formData = {
          type: transaction.type,
          title: transaction.title,
          amount: transaction.amount,
          dueDate: new Date(transaction.dueDate),
          payToEmail: transaction.payTo.email,
          tags: transaction.tags ?? [],
          description: transaction.description || '',
          isRecurring: false,
          recurrenceSelector: undefined,
          recurrenceType: undefined,
          recurrenceUntil: undefined,
          recurrenceInterval: undefined,
          installmentsTotal: undefined,
          recurrenceStart: undefined,
        }
        setIsResetting(true)
        form.reset(formData)

        // Aguardar todos os re-renders e forçar isDirty = false
        setTimeout(() => {
          // Reset novamente para garantir que não há mudanças
          form.reset(formData, { keepDefaultValues: false })
          // Resetar o estado local também
          setIsDirty(false)
          setIsResetting(false)
        }, 0)
      } else {
        // Reset para modo criação
        form.reset({
          type: RegisterType.EXPENSE,
          title: '',
          amount: '',
          dueDate: new Date(),
          payToEmail: '',
          tags: [],
          description: '',
          isRecurring: false,
          recurrenceSelector: undefined,
          recurrenceType: undefined,
          recurrenceUntil: undefined,
          recurrenceInterval: undefined,
          installmentsTotal: undefined,
          recurrenceStart: undefined,
        })
      }
      initializedTransactionRef.current = currentTransactionId
    }
  }, [open, transaction, form])

  // Resetar ref e estado quando o drawer for fechado
  useEffect(() => {
    if (!open) {
      initializedTransactionRef.current = null
      setIsDirty(false)
      setIsResetting(false)
    }
  }, [open])

  // Forçar refetch dos installments toda vez que o drawer for aberto
  useEffect(() => {
    if (open && transaction && serieId) {
      refetchInstallments()
    }
  }, [open, transaction, serieId, refetchInstallments])

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
        queryClient.invalidateQueries({ queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug) })
      },
    },
  })

  const { mutate: payTransaction } = usePayTransaction({
    mutation: {
      onSuccess: () => {
        toast.success('Status da transação atualizado com sucesso!')
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        queryClient.invalidateQueries({
          queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
        })

        // Invalidar installments se houver serieId
        if (serieId) {
          queryClient.invalidateQueries({
            queryKey: getGetTransactionInstallmentsQueryKey(slug, serieId),
          })
        }

        onOpenChange(false)
      },
      onError: () => toast.error('Erro ao atualizar status da transação'),
    },
  })

  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction({
    mutation: {
      onSuccess: () => {
        toast.success('Transação atualizada com sucesso!')
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        // Recarregar dados do dashboard
        queryClient.invalidateQueries({
          queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
        })

        // Invalidar installments se houver serieId
        if (serieId) {
          queryClient.invalidateQueries({
            queryKey: getGetTransactionInstallmentsQueryKey(slug, serieId),
          })
        }

        onOpenChange(false)
      },
      onError: () => toast.error('Erro ao atualizar transação'),
    },
  })

  const handleSubmit = useCallback(
    async (data: NewTransactionSchema) => {
      if (isEditMode && transaction) {
        const normalizeAmount = (value: unknown): string => {
          if (typeof value === 'number') return value.toFixed(2)
          const raw = String(value ?? '')
          // Keep digits and separators, convert comma to dot, then parse
          const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '.')
          const num = Number.parseFloat(cleaned)
          if (Number.isFinite(num)) return num.toFixed(2)
          // fallback: zero to meet server schema and avoid undefined
          return '0.00'
        }
        const normalizedAmount = normalizeAmount(
          (data as NewTransactionSchema)?.amount ??
            (transaction as ListTransactions200TransactionsItem)?.amount ??
            '0.00'
        )
        const serieId = String((transaction as ListTransactions200TransactionsItem).serieId ?? '')
        const payload = {
          type: data.type,
          title: data.title,
          amount: normalizedAmount,
          dueDate: data.dueDate.toISOString(),
          tags: data.tags,
          description: data.description,
          serieId,
          ...(data.payToEmail ? { payToEmail: data.payToEmail } : {}),
        }

        // Atualizar a transação (incluindo payTo se fornecido)
        if (onExternalSubmit) {
          await Promise.resolve(onExternalSubmit({ slug, id: transaction.id, data: payload }))
        } else {
          updateTransaction({
            slug,
            id: transaction.id,
            data: payload,
          })
        }
      } else {
        createTransaction({ slug, data: { ...data, amount: data.amount } })
      }
    },
    [isEditMode, transaction, onExternalSubmit, slug, updateTransaction, createTransaction]
  )

  const handleMainAction = useCallback(() => {
    if (isEditMode) {
      // Se não há mudanças, verificar se deve marcar como pago ou cancelar pagamento
      if (!isDirty) {
        if (transaction?.status === 'paid') {
          // Cancelar pagamento - usar endpoint específico
          payTransaction({ slug, id: transaction.id, data: {} })
        } else if (transaction?.status === 'canceled') {
          // Reativar transação - marcar como pendente
          toast.success('Transação reativada com sucesso!')
          const payload = {
            type: transaction.type,
            title: transaction.title,
            amount: transaction.amount,
            dueDate: new Date(transaction.dueDate),
            payToEmail: transaction.payTo?.email || '',
            tags: transaction.tags || [],
            description: transaction.description || '',
            isRecurring: false,
            recurrenceSelector: undefined,
            recurrenceType: undefined,
            recurrenceUntil: undefined,
            recurrenceInterval: undefined,
            installmentsTotal: undefined,
            recurrenceStart: undefined,
          }
          handleSubmit(payload as NewTransactionSchema)
        } else {
          // Marcar como pago
          setPaymentDialogOpen(true)
        }
        return
      }

      // Se há mudanças, salvar edição
      const formData = form.getValues()

      // Se o form não tem dados completos, usa os dados da transação com as mudanças
      if (!formData.title || !formData.amount) {
        const computedEmail = formData.payToEmail || transaction?.payTo?.email || ''
        const completeData = {
          type: formData.type || transaction?.type,
          title: formData.title || transaction?.title || '',
          amount:
            (formData.amount as string) ||
            (transaction as ListTransactions200TransactionsItem)?.amount ||
            '0.00',
          dueDate: formData.dueDate || new Date(transaction?.dueDate || new Date()),
          payToEmail: computedEmail,
          tags: formData.tags || transaction?.tags,
          description: formData.description || transaction?.description || '',
          isRecurring: formData.isRecurring || false,
          recurrenceSelector: formData.recurrenceSelector,
          recurrenceType: formData.recurrenceType,
          recurrenceUntil: formData.recurrenceUntil,
          recurrenceInterval: formData.recurrenceInterval,
          installmentsTotal: formData.installmentsTotal,
          recurrenceStart: formData.recurrenceStart,
        }
        handleSubmit(completeData as NewTransactionSchema)
      } else {
        handleSubmit(formData)
      }
    } else {
      // Para modo criação, usar form.watch() para obter valores em tempo real
      const watchedValues = form.watch()

      // Se isRecurring for true, mas o usuário não preencheu os campos de recorrência,
      // desmarcar isRecurring e limpar todos os campos de recorrência
      if (watchedValues.isRecurring) {
        const recurrenceType = watchedValues.recurrenceType
        const recurrenceInterval = watchedValues.recurrenceInterval

        if (!recurrenceType || !recurrenceInterval) {
          form.setValue('isRecurring', false)
          form.setValue('recurrenceSelector', undefined)
          form.setValue('recurrenceType', undefined)
          form.setValue('recurrenceInterval', undefined)
          form.setValue('recurrenceUntil', undefined)
          form.setValue('installmentsTotal', undefined)
          form.setValue('recurrenceStart', undefined)

          // Aguardar um pouco para os campos serem limpos e então verificar erros
          setTimeout(() => {
            const errors = form.formState.errors
            if (Object.keys(errors).length > 0) {
              // Forçar validação e mostrar erros
              form.trigger()
              return
            }

            form.handleSubmit(handleSubmit)()
          }, 100)
          return
        }
      }

      // Se chegou até aqui, os dados estão válidos
      form.handleSubmit(handleSubmit)()
    }
  }, [isEditMode, isDirty, handleSubmit, form, transaction, payTransaction, slug])

  // Títulos dinâmicos baseados no tipo do form (apenas para modo criação)
  const title = isEditMode ? baseTitle : `Criar nova ${isExpense ? 'Despesa' : 'Receita'}`
  const description = isEditMode
    ? baseDescription
    : `Crie um nova ${isExpense ? 'despesa' : 'receita'} e defina os detalhes.`

  // Memoizar estilos para evitar recálculos desnecessários
  const drawerClassName = useMemo(() => {
    return isMobile
      ? `w-full [&[data-vaul-drawer-direction=bottom]]:!min-h-[50vh] ${isKeyboardOpen ? 'keyboard-active' : ''}`
      : 'h-full w-[450px] max-w-[90vw] [&[data-vaul-drawer-direction=right]]:!max-h-[100vh] [&[data-vaul-drawer-direction=right]]:!h-[100vh]'
  }, [isMobile, isKeyboardOpen])

  const drawerStyle = useMemo(
    () => ({
      maxHeight: isMobile
        ? isKeyboardOpen
          ? `calc(100vh - ${keyboardHeight}px - 20px)`
          : '95vh'
        : '100vh',
      height: isMobile
        ? isKeyboardOpen
          ? `calc(100vh - ${keyboardHeight}px - 20px)`
          : '95vh'
        : '100vh',
      minHeight: isMobile ? '50vh' : 'auto',
      width: isMobile ? '100%' : '450px',
      maxWidth: isMobile ? 'none' : '90vw',
    }),
    [isMobile, isKeyboardOpen, keyboardHeight]
  )

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
        <DrawerContent className={drawerClassName} style={drawerStyle}>
          <DrawerHeader className="pb-4 border-b">
            <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </DrawerHeader>

          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto overscroll-contain scroll-to-active ${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}
          >
            <div className={isMobile ? 'max-w-2xl mx-auto' : 'w-full'}>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit, errors =>
                    showToastOnErrorSubmit({ form, errors })
                  )}
                  className={isMobile ? 'space-y-6' : 'space-y-4'}
                >
                  <div className="space-y-4">
                    <TypeField form={form} disabled={isReadOnly || isPaid} />
                    <TitleField form={form} disabled={isReadOnly || isPaid} />
                    <AmountField form={form} disabled={isReadOnly || isPaid} />
                    <CalendarField form={form} disabled={isReadOnly || isPaid} />
                    <PayToField form={form} data={userData} disabled={isReadOnly || isPaid} />
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
                    <TagField form={form} disabled={isReadOnly || isPaid} />
                    <DescriptionField form={form} disabled={isReadOnly || isPaid} />
                  </div>

                  {isEditMode && (
                    <div className="space-y-2 p-4 bg-muted/20 rounded-lg border">
                      <h4 className="text-sm font-medium text-muted-foreground">Recorrência</h4>
                      {(() => {
                        const total = transaction?.installmentsTotal
                        if (total === null) {
                          return <p className="text-sm">Recorrente: Sim (ilimitada)</p>
                        }
                        if (typeof total === 'number' && total > 1) {
                          return <p className="text-sm">Recorrente: Sim ({total} parcelas)</p>
                        }
                        return <p className="text-sm">Recorrente: Não</p>
                      })()}
                      <p className="text-xs text-muted-foreground">
                        Edição de recorrência indisponível no modo edição.
                      </p>
                    </div>
                  )}
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
                    variant={isEditMode && transaction?.status === 'paid' ? 'outline' : 'default'}
                    className="flex-1 h-11"
                  >
                    {isUpdating
                      ? 'Processando...'
                      : isEditMode
                        ? transaction?.status === 'paid'
                          ? 'Cancelar Pagamento'
                          : transaction?.status === 'canceled'
                            ? 'Reativar Transação'
                            : isDirty
                              ? 'Salvar edição'
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
            // Invalidar queries para atualizar os dados
            queryClient.invalidateQueries({
              queryKey: getListTransactionsQueryKey(slug),
            })
            onOpenChange(false)
          }}
        />
      )}
    </>
  )
}
