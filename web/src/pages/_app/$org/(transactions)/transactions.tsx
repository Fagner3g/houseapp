import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import z from 'zod'

import { LoadingErrorState } from '@/components/loading-error-state'
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
    view: z.enum(['table', 'calendar', 'payto']).default('payto'),
    responsibleUserId: z.string().optional(),
    onlyMarked: z.coerce.boolean().optional(),
  }),
})

function Transaction() {
  const { transactions, isPending, error, refetch, ...props } = useTransaction()

  return (
    <LoadingErrorState
      isLoading={isPending}
      error={error}
      onRetry={refetch}
      title="Erro ao carregar transações"
      description="Não foi possível carregar as transações. Verifique sua conexão e tente novamente."
    >
      <div className="mt-4 flex flex-col gap-4">
        <TableLIstTransactions transactions={transactions} {...props} />
      </div>
    </LoadingErrorState>
  )
}
