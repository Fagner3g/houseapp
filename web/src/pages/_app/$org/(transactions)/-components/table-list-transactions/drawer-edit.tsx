import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  getGetOrgSlugReportsTransactionsQueryKey,
  getListTransactionsQueryKey,
  useListUsersByOrg,
  useUpdateTransaction,
} from '@/api/generated/api'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
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
import { PayToField } from '../modal-new-transaction/pay-to-field'
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

export function DrawerEdit({ transaction, open, onOpenChange }: Props) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { data } = useListUsersByOrg(slug)
  const isMobile = useIsMobile()
  const currentUser = useAuthStore(s => s.user)
  const [hasChanges, setHasChanges] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  // Check if current user is the owner of the transaction
  const isOwner = currentUser?.id === transaction?.ownerId
  const isReadOnly = !isOwner

  const form = useForm<NewTransactionSchema>({
    resolver: zodResolver(newTransactionSchema),
    defaultValues: { type: RegisterType.EXPENSE, isRecurring: false },
  })

  useEffect(() => {
    if (!transaction || !data?.users) return

    const payToEmail = data?.users?.find(u => u.name === transaction.payTo)?.email ?? ''

    form.reset({
      type: transaction.type as RegisterType,
      title: transaction.title,
      amount: transaction.amount,
      dueDate: new Date(transaction.dueDate),
      payToEmail,
      tags: transaction.tags,
      description: transaction.description || '',
      isRecurring: false,
    })
    setHasChanges(false)
  }, [transaction, form, data])

  // Monitor form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction({
    mutation: {
      onSuccess: () => {
        toast.success('Transação atualizada com sucesso!')
        // Invalidar cache das transações
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        // Invalidar cache do dashboard
        queryClient.invalidateQueries({
          queryKey: getGetOrgSlugReportsTransactionsQueryKey(slug),
        })
        onOpenChange(false)
      },
      onError: () => toast.error('Erro ao atualizar transação'),
    },
  })

  function handleSubmit(data: NewTransactionSchema) {
    if (!transaction) return
    updateTransaction({
      slug,
      id: transaction.id,
      data: { ...data, amount: data.amount, serieId: transaction.serieId },
    })
  }

  function handleMainAction() {
    if (!transaction) return

    if (hasChanges) {
      // Save changes
      form.handleSubmit(handleSubmit, () => {
        showToastOnErrorSubmit({ form })
      })()
    } else {
      // Open payment dialog
      setPaymentDialogOpen(true)
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isReadOnly ? 'Visualizar transação' : 'Editar transação'}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-4 p-4 overflow-y-auto overflow-x-hidden">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit, () => showToastOnErrorSubmit({ form }))}
                className="flex flex-col gap-4"
              >
                <TypeField form={form} disabled={isReadOnly} />
                <TitleField form={form} disabled={isReadOnly} />
                <div className="flex flex-col gap-5 sm:flex-row">
                  <AmountField form={form} disabled={isReadOnly} />
                  <CalendarField form={form} disabled={isReadOnly} />
                </div>
                <PayToField form={form} data={data} disabled={isReadOnly} />
                <TagField form={form} disabled={isReadOnly} />
                <DescriptionField form={form} disabled={isReadOnly} />
              </form>
            </Form>
            <TransactionSummary transaction={transaction} onDelete={() => onOpenChange(false)} />
          </div>
          <DrawerFooter className="flex gap-2">
            <DrawerClose asChild>
              <Button variant="outline">{isReadOnly ? 'Fechar' : 'Cancelar'}</Button>
            </DrawerClose>
            {transaction && !isReadOnly && (
              <Button
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleMainAction()
                }}
                disabled={isUpdating}
                variant={
                  hasChanges ? 'default' : transaction.status === 'paid' ? 'outline' : 'default'
                }
              >
                {isUpdating
                  ? 'Processando...'
                  : hasChanges
                    ? 'Salvar Edição'
                    : transaction.status === 'paid'
                      ? 'Cancelar Pagamento'
                      : 'Marcar como Pago'}
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <PaymentDateDialog
        transaction={transaction}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={() => {
          // Fechar o drawer apenas se for pagamento (não cancelamento)
          if (transaction?.status !== 'paid') {
            onOpenChange(false) // Fechar o drawer
          }
          // Se for cancelamento, manter o drawer aberto
        }}
      />
    </>
  )
}
