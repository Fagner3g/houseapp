import { IconTrash } from '@tabler/icons-react'
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
import { Button } from '@/components/ui/button'

interface Props {
  table: Table<ListTransactions200TransactionsItem>
}

export function DeleteSelected({ table }: Props) {
  const selected = table.getSelectedRowModel().rows.length
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    const ids = table.getSelectedRowModel().rows.map(row => row.original.serieId)
    table.options.meta?.deleteRows(ids)
    table.resetRowSelection()
    setOpen(false)
  }

  if (selected === 0) return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1 px-2 sm:px-3"
          aria-label={`Excluir ${selected} transação(ões)`}
        >
          <IconTrash size={16} />
          <span className="sm:hidden" aria-hidden>
            {selected}
          </span>
          <span className="hidden sm:inline">Excluir selecionadas ({selected})</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transações</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {selected} transação(ões)? Esta ação não pode ser
            desfeita.
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
