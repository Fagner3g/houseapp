import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Loader2 } from 'lucide-react'
import z from 'zod'

import { TableLIstTransactions } from './-components/table-list-transactions'
import { useTransaction } from './-components/table-list-transactions/hook/use-transaction'

const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

export const Route = createFileRoute('/_app/$org/(transactions)/transactions')({
  component: Transaction,
  validateSearch: z.object({
    tags: z.array(z.string()).optional(),
    type: z.enum(['all', 'income', 'expense']).default('all'),
    dateFrom: z.string().default(startOfMonth),
    dateTo: z.string().default(endOfMonth),
    page: z.coerce.number().int().default(1),
    perPage: z.coerce.number().int().default(10),
  }),
})

function Transaction() {
  const { transactions, isPending } = useTransaction()

  if (isPending) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-zinc-500">Aguarde um momento...</p>
        <Loader2 className="text-zinc-500 animate-spin size-10" />
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <TableLIstTransactions transactions={transactions} />
    </div>
  )
}
