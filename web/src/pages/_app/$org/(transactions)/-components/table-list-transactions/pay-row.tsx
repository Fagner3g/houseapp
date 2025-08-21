import type { Table } from '@tanstack/react-table'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface Props {
  id: string
  status: ListTransactions200TransactionsItem['status']
  table: Table<ListTransactions200TransactionsItem>
}

export function PayRowAction({ id, status, table }: Props) {
  const [open, setOpen] = useState(false)

  async function handlePay() {
    await table.options.meta?.payRows([id])
    setOpen(false)
  }

  const isPaid = status === 'paid'

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem>{isPaid ? 'Cancelar pagamento' : 'Pagar'}</DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isPaid ? 'Cancelar pagamento' : 'Pagar transação'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isPaid
              ? 'Tem certeza que deseja cancelar o pagamento desta transação?'
              : 'Tem certeza que deseja marcar esta transação como paga?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handlePay}>
            {isPaid ? 'Cancelar pagamento' : 'Pagar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
