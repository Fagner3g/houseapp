import type { Table } from '@tanstack/react-table'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { PaymentDateDialog } from './payment-date-dialog'

interface Props {
  id: string
  status: ListTransactions200TransactionsItem['status']
  table: Table<ListTransactions200TransactionsItem>
}

export function PayRowAction({ id, status, table }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] =
    useState<ListTransactions200TransactionsItem | null>(null)

  const handleClick = () => {
    // Encontrar a transação correspondente
    const transaction = table.getRowModel().rows.find(row => row.original.id === id)?.original
    setSelectedTransaction(transaction || null)
    setOpen(true)
  }

  const isPaid = status === 'paid'

  return (
    <>
      <DropdownMenuItem onClick={handleClick}>
        {isPaid ? 'Cancelar pagamento' : 'Pagar'}
      </DropdownMenuItem>

      <PaymentDateDialog
        transaction={selectedTransaction}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          // Invalidar cache da tabela após sucesso
          table.resetRowSelection()
        }}
      />
    </>
  )
}
