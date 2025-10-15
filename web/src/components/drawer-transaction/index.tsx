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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useIsMobile } from '@/hooks/use-mobile'
import { useScrollToActiveField } from '@/hooks/use-scroll-to-active-field'
import { useVirtualKeyboard } from '@/hooks/use-virtual-keyboard'
import { showToastOnErrorSubmit } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { PaymentDateDialog } from '../../pages/_app/$org/(transactions)/-components/table-list-transactions/payment-date-dialog'
import { TransactionSummary } from '../../pages/_app/$org/(transactions)/-components/table-list-transactions/transaction-summary'
import { AmountField } from './amount-field'
import { ChatSection } from './chat-section'
import { DescriptionField } from './description-field'
import { CalendarField } from './due-date-field'
import { InstallmentsTotalField } from './installments-total-field'
import { RecurrenceField } from './is-recurring-filed'
import { PayToField } from './pay-to-field'
import { RecurrenceIntervalField } from './recurrence-interval-field'
import { RecurrenceSelectorField } from './recurrence-selector-field'
import { RecurrenceTypeField } from './recurrence-type-field'
import { RecurrenceUntilField } from './recurrence-until-field'
import { getDrawerContext } from './row-mapper'
import { type NewTransactionSchema, newTransactionSchema, RegisterType } from './schema'
import { TagField } from './tag-field'
import { TitleField } from './title-filed'
import { useTransactionDrawer } from './transaction-drawer-context'
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

function DrawerTransactionContent({ transaction, open, onOpenChange, onExternalSubmit }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const isMobile = useIsMobile()
  const { slug } = useActiveOrganization()
  const { data: userData } = useListUsersByOrg(slug)
  const { isKeyboardOpen, keyboardHeight } = useVirtualKeyboard()
  const scrollContainerRef = useScrollToActiveField(isKeyboardOpen)
  const {
    activeTab,
    setActiveTab,
    isDirty,
    setIsDirty,
    isResetting,
    setIsResetting,
    setTransactionData,
  } = useTransactionDrawer()

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
  const hadUnsavedChanges = useRef(false)

  // Criar form local (não compartilhado)
  const localForm = useForm<NewTransactionSchema>({
    resolver: zodResolver(newTransactionSchema),
    defaultValues: {
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
    },
  })

  // Sempre usar localForm para evitar problemas com estado compartilhado
  const form = localForm

  // Helper para criar formData a partir de uma transação
  const createFormData = useCallback(
    (transaction: ListTransactions200TransactionsItem) => ({
      type: transaction.type as 'expense' | 'income',
      title: transaction.title as string,
      amount: transaction.amount as string,
      dueDate: new Date(transaction.dueDate),
      payToEmail: transaction.payTo.email as string,
      tags: transaction.tags ?? [],
      description: transaction.description || '',
      isRecurring: false as const,
      recurrenceSelector: undefined,
      recurrenceType: undefined,
      recurrenceUntil: undefined,
      recurrenceInterval: undefined,
      installmentsTotal: undefined,
      recurrenceStart: undefined,
    }),
    []
  )

  // Serializar dados da transação com cálculos derivados
  const labels = getDrawerContext(transaction, currentUser?.id)
  const { isEditMode, isPaid, isReadOnly, title: baseTitle, description: baseDescription } = labels

  // Usar form.getValues() em vez de form.watch() para evitar re-renders
  const formType = form.getValues('type')
  const isExpense = formType === RegisterType.EXPENSE

  // Detectar mudanças reais no form
  useEffect(() => {
    if (!transaction || !isEditMode) {
      setIsDirty(false)
      hadUnsavedChanges.current = false
      return
    }

    const subscription = form.watch((_value, { name }) => {
      // Ignorar mudanças durante o reset
      if (isResetting) {
        return
      }

      // Considerar como mudança se tiver um nome de campo (type pode ser undefined com setValue)
      if (name) {
        setIsDirty(true)
        hadUnsavedChanges.current = true
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [form, transaction, isEditMode, isResetting, setIsDirty])

  // Removido: useEffect que sincronizava com formState.isDirty
  // Causava falsos positivos pois formState.isDirty ficava true logo após reset
  // O form.watch() acima já captura todas as mudanças, incluindo tags (com shouldDirty: true)

  // Preencher formulário quando a transação mudar
  useEffect(() => {
    if (!open) {
      // Quando o drawer fecha, se houver mudanças não salvas, invalidar cache
      if (hadUnsavedChanges.current) {
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        hadUnsavedChanges.current = false
      }
      // Limpar o initializedRef para forçar reset na próxima abertura
      initializedTransactionRef.current = null
      return
    }

    const currentTransactionId = transaction?.id || 'new'

    // Só resetar se a transação mudou
    if (initializedTransactionRef.current !== currentTransactionId) {
      // Resetar contexto quando uma nova transação é carregada
      setIsDirty(false)
      setIsResetting(false)
      setActiveTab('form')
      hadUnsavedChanges.current = false

      if (transaction) {
        setIsResetting(true)
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
  }, [open, transaction, form, setIsDirty, setIsResetting, setActiveTab, queryClient, slug])

  // Resetar form quando isResetting é marcado
  useEffect(() => {
    if (isResetting && transaction && initializedTransactionRef.current === transaction.id) {
      setTimeout(() => {
        form.reset(createFormData(transaction), {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        })
        setIsDirty(false)
        setIsResetting(false)
      }, 0)
    }
  }, [isResetting, transaction, createFormData, setIsDirty, setIsResetting, form])

  // Salvar dados da transação no contexto
  useEffect(() => {
    if (transaction && open) {
      setTransactionData(transaction)
    }
  }, [transaction, open, setTransactionData])

  // Forçar recarregamento quando form perde dados (fallback)
  useEffect(() => {
    if (transaction && !isResetting && activeTab === 'form') {
      const timeoutId = setTimeout(() => {
        const currentValues = form.getValues()
        const hasEmptyValues =
          !currentValues.title ||
          !currentValues.amount ||
          currentValues.title === '' ||
          currentValues.amount === '' ||
          currentValues.title === undefined ||
          currentValues.amount === undefined

        if (hasEmptyValues) {
          form.reset(createFormData(transaction), {
            keepErrors: false,
            keepDirty: false,
            keepIsSubmitted: false,
            keepTouched: false,
            keepIsValid: false,
            keepSubmitCount: false,
          })
        }
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [activeTab, transaction, isResetting, createFormData, form])

  // Resetar ref quando o drawer for fechado, mas manter estado do contexto
  useEffect(() => {
    if (!open) {
      initializedTransactionRef.current = null
      // Não resetar isDirty, isResetting e activeTab para manter estado entre aberturas
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

          // Criar transação otimista com estrutura completa
          const optimistic: ListTransactions200TransactionsItem = {
            id: `optimistic-${Date.now()}`,
            serieId: `optimistic-series-${Date.now()}`,
            title: data.title,
            type: data.type,
            amount: data.amount,
            dueDate: typeof data.dueDate === 'string' ? data.dueDate : new Date().toISOString(),
            status: 'pending',
            ownerId: '', // Será preenchido pelo backend
            payToId: '', // Será preenchido pelo backend
            payTo: { name: '', email: data.payToEmail },
            ownerName: '', // Será preenchido pelo backend
            installmentsTotal:
              typeof data.installmentsTotal === 'number' ? data.installmentsTotal : 1,
            installmentsPaid: 0,
            tags: data.tags || [],
            overdueDays: 0,
            contextualizedType: data.type,
            paidAt: null,
            description: data.description || '',
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
        // Invalidar cache com refetch forçado
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
          refetchType: 'all',
        })
        queryClient.invalidateQueries({
          queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
          refetchType: 'all',
        })

        // Forçar refetch imediato para garantir atualização
        queryClient.refetchQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
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

          <div className="flex-1 overflow-hidden">
            <Form {...form}>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="h-full flex flex-col min-h-0"
              >
                <div className="px-6 pt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form">Transação</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="form"
                  className="flex-1 overflow-y-auto overscroll-contain scroll-to-active"
                >
                  <div
                    ref={scrollContainerRef}
                    className={`${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}
                  >
                    <div className={isMobile ? 'max-w-2xl mx-auto' : 'w-full'}>
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

                        {form.watch('isRecurring') && (
                          <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">
                              Configuração de Recorrência
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              <RecurrenceTypeField form={form} />
                              <RecurrenceSelectorField form={form} />
                              <RecurrenceIntervalField form={form} />
                            </div>
                            <div className="grid grid-cols-1 gap-3">
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
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Recorrência
                            </h4>
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
                </TabsContent>

                <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
                  {transaction ? (
                    <ChatSection transactionId={transaction.id} />
                  ) : (
                    <div className="flex-1 p-6">
                      <div className="text-center text-muted-foreground text-sm">
                        Selecione uma transação para ver o chat
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Form>
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
                            : isDirty && activeTab === 'form'
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

export function DrawerTransaction({ transaction, open, onOpenChange, onExternalSubmit }: Props) {
  return (
    <DrawerTransactionContent
      transaction={transaction}
      open={open}
      onOpenChange={onOpenChange}
      onExternalSubmit={onExternalSubmit}
    />
  )
}
