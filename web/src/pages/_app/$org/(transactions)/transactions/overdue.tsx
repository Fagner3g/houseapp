import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import z from 'zod'

import { useListTransactions } from '@/api/generated/api'
import type { ListTransactionsParams } from '@/api/generated/model'
import { LoadingErrorState } from '@/components/loading-error-state'
import { TransactionDeadlineAlert } from '@/features/transactions/components/transaction-deadline-alert'
import { TransactionList } from '@/features/transactions/components/transaction-list'
import { toTransactionListItem } from '@/features/transactions/types'
import { useOverdueInvoiceSummaries } from '@/features/transactions/hooks/use-invoice-summary-rows'
import { TransactionOverdueFilters } from '@/features/transactions/components/transaction-overdue-filters'
import { TransactionOverdueHeader } from '@/features/transactions/components/transaction-overdue-header'
import { pageShell } from '@/lib/ui-classes'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions/overdue')({
  component: OverdueTransactionsPage,
  validateSearch: z.object({
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    search: z.string().optional(),
  }),
})

function OverdueTransactionsPage() {
  const { slug } = useActiveOrganization()
  const { accountId, categoryId, type, search } = Route.useSearch()

  const params: ListTransactionsParams = {
    accountId,
    categoryId,
    type,
    dateTo: dayjs().subtract(1, 'day').endOf('day').toISOString(),
    payableOnly: true,
    page: 1,
    perPage: 100,
    search,
  }

  const { data, error, refetch } = useListTransactions(slug, params, {
    query: { enabled: !!slug, placeholderData: keepPreviousData },
  })

  const overdueInvoices = useOverdueInvoiceSummaries()

  const items = useMemo(() => {
    const transactions = (data?.transactions ?? []).map(toTransactionListItem)
    const merged = [...overdueInvoices, ...transactions]
    merged.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
    return merged
  }, [data?.transactions, overdueInvoices])

  const hasOverdue = items.length > 0

  return (
    <LoadingErrorState
      error={error && !data ? error : undefined}
      onRetry={refetch}
      title="Erro ao carregar vencidas"
      description="Não foi possível carregar os lançamentos vencidos."
    >
      <div className={pageShell}>
        <TransactionOverdueHeader />
        <TransactionOverdueFilters />
        <TransactionList items={items} mode="overdue" />
        {hasOverdue && <TransactionDeadlineAlert />}
      </div>
    </LoadingErrorState>
  )
}
