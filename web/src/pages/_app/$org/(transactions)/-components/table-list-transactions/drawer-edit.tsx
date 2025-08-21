import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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

  function handleSubmit(data: NewTransactionSchema) {
    if (!transaction) return
    updateTransaction({ slug, id: transaction.id, data })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Editar transação</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
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
