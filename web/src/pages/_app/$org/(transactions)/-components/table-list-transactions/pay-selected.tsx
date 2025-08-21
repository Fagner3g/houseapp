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

export function PaySelected({ table }: Props) {
  const rows = table.getSelectedRowModel().rows
  const selected = rows.length
  const [open, setOpen] = useState(false)

  async function handlePay() {
    const ids = rows.map(row => row.original.id)
    await table.options.meta?.payRows(ids)
    table.resetRowSelection()
    setOpen(false)
  }

  if (selected === 0) return null

  const allPaid = rows.every(row => row.original.status === 'paid')

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm">
          {allPaid ? `Cancelar pagamento (${selected})` : `Pagar selecionadas (${selected})`}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{allPaid ? 'Cancelar pagamento' : 'Pagar transações'}</AlertDialogTitle>
          <AlertDialogDescription>
            {allPaid
              ? `Tem certeza que deseja cancelar o pagamento de ${selected} transação(ões)?`
              : `Tem certeza que deseja marcar ${selected} transação(ões) como pagas?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handlePay}>
            {allPaid ? 'Cancelar pagamento' : 'Pagar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
