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

interface Props {
  id: string
  table: Table<ListTransactions200TransactionsItem>
}

export function DeleteRowAction({ id, table }: Props) {
  const [open, setOpen] = useState(false)

  // Encontrar a transação na tabela para verificar se é recorrente
  const transaction = table.getRowModel().rows.find(row => row.original.id === id)?.original
  const isRecurring = transaction?.installmentsTotal ? transaction.installmentsTotal > 1 : false

  function handleDelete(deleteAll: boolean = false) {
    if (deleteAll && transaction) {
      // Deletar todas as transações da série
      table.options.meta?.deleteRows([transaction.serieId])
    } else {
      // Deletar apenas esta transação
      table.options.meta?.deleteRows([id])
    }
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600 focus:bg-red-50 focus:text-red-600">
          Excluir
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação</AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring
              ? 'Esta é uma transação recorrente. Você pode excluir apenas esta transação ou todas as transações da série.'
              : 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {isRecurring ? (
            <>
              <AlertDialogAction
                onClick={() => handleDelete(false)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Excluir esta
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => handleDelete(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir todas
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
