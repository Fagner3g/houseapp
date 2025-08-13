import { useState } from 'react'
import type { Table } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
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
import type { ListTransactions200TransactionsItem } from '@/http/generated/model'

interface Props {
  table: Table<ListTransactions200TransactionsItem>
}

export function DeleteSelected({ table }: Props) {
  const selected = table.getSelectedRowModel().rows.length
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    const ids = table.getSelectedRowModel().rows.map(row => row.original.id)
    table.options.meta?.deleteRows?.(ids)
    table.resetRowSelection()
    setOpen(false)
  }

  if (selected === 0) return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Excluir selecionadas ({selected})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transações</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {selected} transação(ões)? Esta ação não pode ser desfeita.
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

