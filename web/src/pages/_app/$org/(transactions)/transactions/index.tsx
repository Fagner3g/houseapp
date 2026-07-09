import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import z from 'zod'

import { useListAccounts, useListTransactions } from '@/api/generated/api'
import type { ListTransactionsParams } from '@/api/generated/model'
import { LoadingErrorState } from '@/components/loading-error-state'
import { TransactionCalendar } from '@/features/transactions/components/transaction-calendar'
import { TransactionFilters } from '@/features/transactions/components/transaction-filters'
import { TransactionKpiRow } from '@/features/transactions/components/transaction-kpi-row'
import { TransactionList } from '@/features/transactions/components/transaction-list'
import { useMergedTransactionList } from '@/features/transactions/hooks/use-invoice-summary-rows'
import { TransactionOverdueBanner } from '@/features/transactions/components/transaction-overdue-banner'
import { TransactionPageHeader } from '@/features/transactions/components/transaction-page-header'
import { pageShell } from '@/lib/ui-classes'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useTransactionListQueryStore } from '@/stores/transaction-list-query'

export const Route = createFileRoute('/_app/$org/(transactions)/transactions/')({
  component: TransactionsPage,
  validateSearch: z.object({
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    status: z.enum(['pending', 'paid', 'canceled']).optional(),
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    search: z.string().optional(),
    recurring: z.enum(['all', 'recurring', 'single']).optional(),
    view: z
      .enum(['list', 'calendar', 'statement'])
      .optional()
      .transform(v => (v === 'statement' ? undefined : v)),
  }),
})

function TransactionsPage() {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate({ from: Route.fullPath })
  const { accountId, categoryId, status, type, search, view } = Route.useSearch()
  const { dateFrom, dateTo, setDateRange } = useTransactionListQueryStore()

  const { data: accountsData } = useListAccounts(slug, { query: { enabled: !!slug } })

  useEffect(() => {
    if (!accountId || !accountsData?.accounts?.length) return

    const isActiveAccount = accountsData.accounts.some(account => account.id === accountId)
    if (!isActiveAccount) {
      navigate({
        search: prev => ({ ...prev, accountId: undefined }),
        replace: true,
      })
    }
  }, [accountId, accountsData?.accounts, navigate])

  const isCalendarView = view === 'calendar'

  const params: ListTransactionsParams = {
    accountId,
    categoryId,
    status,
    type,
    dateFrom: dayjs(dateFrom).startOf('day').toISOString(),
    dateTo: dayjs(dateTo).endOf('day').toISOString(),
    page: 1,
    perPage: 100,
    search,
    payableOnly: !isCalendarView && !accountId,
  }

  const { data, error, refetch } = useListTransactions(slug, params, {
    query: { enabled: !!slug, placeholderData: keepPreviousData },
  })

  const mergedItems = useMergedTransactionList(
    data?.transactions ?? [],
    dateFrom,
    dateTo,
    !isCalendarView
  )

  return (
    <LoadingErrorState
      error={error && !data ? error : undefined}
      onRetry={refetch}
      title="Erro ao carregar transações"
      description="Não foi possível carregar as transações."
    >
      <div className={pageShell}>
        <TransactionPageHeader />
        <TransactionKpiRow />
        <TransactionFilters />
        <TransactionOverdueBanner />
        {isCalendarView ? (
          <TransactionCalendar
            transactions={data?.transactions ?? []}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateRangeChange={setDateRange}
          />
        ) : (
          <TransactionList items={mergedItems} />
        )}
      </div>
    </LoadingErrorState>
  )
}
