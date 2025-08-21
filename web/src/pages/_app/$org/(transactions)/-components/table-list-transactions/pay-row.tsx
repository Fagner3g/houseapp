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
  table: Table<ListTransactions200TransactionsItem>
}

export function PayRowAction({ id, table }: Props) {
  const [open, setOpen] = useState(false)

  async function handlePay() {
    await table.options.meta?.payRows?.([id])
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem>Pagar</DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pagar transação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja marcar esta transação como paga?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handlePay}>Pagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
