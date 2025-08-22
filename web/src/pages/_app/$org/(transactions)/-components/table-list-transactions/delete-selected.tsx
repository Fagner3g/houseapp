import type { Table } from '@tanstack/react-table'
import { useState } from 'react'

import { IconTrash } from '@tabler/icons-react'
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
  const rows = table.getSelectedRowModel().rows
  const selected = rows.length
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    const ids = rows.map(row => row.original.id)
    table.options.meta?.deleteRows(ids)
    table.resetRowSelection()
    setOpen(false)
  }

  const hasRecurring = rows.some(
    row => row.original.installmentsTotal == null || row.original.installmentsTotal > 1,
  )

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
              {hasRecurring &&
                ' Transações recorrentes terão todas as suas ocorrências removidas.'}
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
