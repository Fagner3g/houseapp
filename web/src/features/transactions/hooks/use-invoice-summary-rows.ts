import { useQueries } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import {
  getListStatementsQueryKey,
  listStatements,
  useListAccounts,
  useListTransactions,
} from '@/api/generated/api'
import {
  buildInvoiceSummariesForRange,
  buildOverdueInvoiceSummaries,
  mergeTransactionsWithInvoices,
} from '@/lib/credit-card-invoice-rows'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export function useInvoiceSummaryRows(dateFrom: string, dateTo: string, enabled = true) {
  const { slug } = useActiveOrganization()

  const { data: accountsData } = useListAccounts(slug, {
    query: { enabled: !!slug && enabled },
  })

  const creditCards = useMemo(
    () => (accountsData?.accounts ?? []).filter(a => a.type === 'credit_card'),
    [accountsData?.accounts]
  )

  const extendedFrom = dayjs(dateFrom).subtract(2, 'month').startOf('day').toISOString()
  const extendedTo = dayjs(dateTo).add(1, 'month').endOf('day').toISOString()

  const { data: extendedTxData } = useListTransactions(
    slug,
    { dateFrom: extendedFrom, dateTo: extendedTo, perPage: 500 },
    { query: { enabled: !!slug && enabled && creditCards.length > 0 } }
  )

  const statementQueries = useQueries({
    queries: creditCards.map(card => ({
      queryKey: getListStatementsQueryKey(slug, card.id),
      queryFn: () => listStatements(slug, card.id),
      enabled: !!slug && enabled,
    })),
  })

  return useMemo(() => {
    const statementsByAccountId: Record<string, NonNullable<typeof statementQueries[0]['data']>['statements']> =
      {}

    creditCards.forEach((card, index) => {
      statementsByAccountId[card.id] = statementQueries[index]?.data?.statements ?? []
    })

    const { summaries, hiddenTransactionIds } = buildInvoiceSummariesForRange({
      creditCards,
      statementsByAccountId,
      transactions: extendedTxData?.transactions ?? [],
      dateFrom,
      dateTo,
    })

    return { summaries, hiddenTransactionIds }
  }, [creditCards, statementQueries, extendedTxData?.transactions, dateFrom, dateTo])
}

export function useOverdueInvoiceSummaries(enabled = true) {
  const { slug } = useActiveOrganization()

  const { data: accountsData } = useListAccounts(slug, {
    query: { enabled: !!slug && enabled },
  })

  const creditCards = useMemo(
    () => (accountsData?.accounts ?? []).filter(a => a.type === 'credit_card'),
    [accountsData?.accounts]
  )

  const extendedFrom = dayjs().subtract(14, 'month').startOf('day').toISOString()
  const extendedTo = dayjs().endOf('day').toISOString()

  const { data: extendedTxData } = useListTransactions(
    slug,
    { dateFrom: extendedFrom, dateTo: extendedTo, perPage: 500 },
    { query: { enabled: !!slug && enabled && creditCards.length > 0 } }
  )

  const statementQueries = useQueries({
    queries: creditCards.map(card => ({
      queryKey: getListStatementsQueryKey(slug, card.id),
      queryFn: () => listStatements(slug, card.id),
      enabled: !!slug && enabled,
    })),
  })

  return useMemo(() => {
    const statementsByAccountId: Record<string, NonNullable<typeof statementQueries[0]['data']>['statements']> =
      {}

    creditCards.forEach((card, index) => {
      statementsByAccountId[card.id] = statementQueries[index]?.data?.statements ?? []
    })

    return buildOverdueInvoiceSummaries({
      creditCards,
      statementsByAccountId,
      transactions: extendedTxData?.transactions ?? [],
    })
  }, [creditCards, statementQueries, extendedTxData?.transactions])
}

export function useMergedTransactionList(
  transactions: Parameters<typeof mergeTransactionsWithInvoices>[0],
  dateFrom: string,
  dateTo: string,
  enabled = true
) {
  const { summaries, hiddenTransactionIds } = useInvoiceSummaryRows(dateFrom, dateTo, enabled)

  return useMemo(
    () =>
      mergeTransactionsWithInvoices(
        transactions,
        summaries,
        hiddenTransactionIds,
        dateFrom,
        dateTo
      ),
    [transactions, summaries, hiddenTransactionIds, dateFrom, dateTo]
  )
}
