import { IconCheck, IconX } from '@tabler/icons-react'
import type { Table } from '@tanstack/react-table'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { BulkPaymentDialog } from './bulk-payment-dialog'

interface Props {
  table: Table<ListTransactions200TransactionsItem>
}

export function PaySelected({ table }: Props) {
  const rows = table.getSelectedRowModel().rows
  const selected = rows.length
  const [open, setOpen] = useState(false)

  if (selected === 0) return null

  const allPaid = rows.every(row => row.original.status === 'paid')
  const selectedTransactions = rows.map(row => row.original)

  return (
    <>
      <Button
        size="sm"
        className={`gap-2 px-3 ${
          allPaid
            ? 'bg-orange-600 hover:bg-orange-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
        aria-label={
          allPaid
            ? `Cancelar pagamento de ${selected} transação(ões)`
            : `Pagar ${selected} transação(ões)`
        }
        onClick={() => setOpen(true)}
      >
        {allPaid ? <IconX size={16} /> : <IconCheck size={16} />}
        <span className="text-sm">{allPaid ? 'Cancelar' : 'Pagar'}</span>
      </Button>

      <BulkPaymentDialog
        transactions={selectedTransactions}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          table.resetRowSelection()
        }}
      />
    </>
  )
}
