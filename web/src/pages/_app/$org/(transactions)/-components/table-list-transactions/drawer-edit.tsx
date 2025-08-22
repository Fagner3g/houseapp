import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
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
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState<NewTransactionSchema | null>(null)

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
      isRecurring: false,
    })
  }, [transaction, form, data])

  const { mutate: updateTransaction } = useUpdateTransaction({
    mutation: {
      onSuccess: () => {
        toast.success('Transação atualizada com sucesso!')
        queryClient.invalidateQueries({
          queryKey: getListTransactionsQueryKey(slug),
        })
        onOpenChange(false)
      },
      onError: () => toast.error('Erro ao atualizar transação'),
    },
  })

    function sendUpdate(data: NewTransactionSchema, applyToSeries: boolean) {
      if (!transaction) return

      const isSeries =
        transaction.installmentsTotal == null || transaction.installmentsTotal > 1

      updateTransaction({
        slug,
        id: transaction.id,
        data: {
          ...data,
          isRecurring: applyToSeries && isSeries,
          installmentsTotal: applyToSeries
            ? transaction.installmentsTotal ?? undefined
            : undefined,
          applyToSeries,
          // biome-ignore lint/suspicious/noExplicitAny: API uses generated types
        } as any,
      })
    }

    function handleSubmit(data: NewTransactionSchema) {
      if (!transaction) return

      const isRecurring =
        transaction.installmentsTotal == null || transaction.installmentsTotal > 1

      if (isRecurring) {
        setPendingData(data)
        setConfirmOpen(true)
        return
      }

      sendUpdate(data, true)
    }

    function handleUpdateCurrent() {
      if (!pendingData) return
      sendUpdate(pendingData, false)
      setConfirmOpen(false)
      setPendingData(null)
    }

    function handleUpdateSeries() {
      if (!pendingData) return
      sendUpdate(pendingData, true)
      setConfirmOpen(false)
      setPendingData(null)
    }

    useEffect(() => {
      if (!open) {
        setConfirmOpen(false)
        setPendingData(null)
      }
    }, [open])

  const isRecurring =
    transaction != null &&
    (transaction.installmentsTotal == null || transaction.installmentsTotal > 1)

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar transação</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-4 p-4 overflow-y-auto overflow-x-hidden">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                <TypeField form={form} />
                <TitleField form={form} />
                <div className="flex flex-col gap-5 sm:flex-row">
                  <AmountField form={form} />
                  <CalendarField form={form} />
                </div>
                <PayToField form={form} data={data} />
                <TagField form={form} />
                <DescriptionField form={form} />
                <Button type="submit">Salvar</Button>
              </form>
            </Form>
            <TransactionSummary transaction={transaction} />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {isRecurring && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Atualizar transação recorrente</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja atualizar apenas esta ocorrência ou toda a série?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={handleUpdateCurrent}>
                Apenas esta
              </AlertDialogCancel>
              <AlertDialogAction type="button" onClick={handleUpdateSeries}>
                Toda a série
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
