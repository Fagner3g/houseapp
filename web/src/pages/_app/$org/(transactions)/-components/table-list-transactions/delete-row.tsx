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
  transaction: ListTransactions200TransactionsItem
  table: Table<ListTransactions200TransactionsItem>
}

export function DeleteRowAction({ transaction, table }: Props) {
  const [open, setOpen] = useState(false)

  function handleDelete() {
    table.options.meta?.deleteRows([transaction.id])
    setOpen(false)
  }

  const isRecurring =
    transaction.installmentsTotal == null || transaction.installmentsTotal > 1

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação</AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring
              ? 'Esta transação faz parte de uma recorrência e todas as suas ocorrências serão excluídas. Deseja continuar?'
              : 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
