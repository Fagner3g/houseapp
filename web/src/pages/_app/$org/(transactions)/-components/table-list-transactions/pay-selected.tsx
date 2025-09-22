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
        className="gap-1 px-2 sm:px-3 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
        aria-label={
          allPaid
            ? `Cancelar pagamento de ${selected} transação(ões)`
            : `Pagar ${selected} transação(ões)`
        }
        onClick={() => setOpen(true)}
      >
        {allPaid ? <IconX size={16} /> : <IconCheck size={16} />}
        <span className="sm:hidden" aria-hidden>
          {selected}
        </span>
        <span className="hidden sm:inline">
          {allPaid ? `Cancelar pagamento (${selected})` : `Pagar selecionadas (${selected})`}
        </span>
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
