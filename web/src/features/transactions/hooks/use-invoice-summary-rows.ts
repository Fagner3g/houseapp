import { useQueries, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import {
  getListStatementsQueryKey,
  listStatements,
  useListAccounts,
  useListTransactions,
} from '@/api/generated/api'
import type { ListAccounts200 } from '@/api/generated/model'
import {
  buildInvoiceSummariesForRange,
  buildOverdueInvoiceSummaries,
  mergeTransactionsWithInvoices,
} from '@/lib/credit-card-invoice-rows'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { http } from '@/lib/http'

function useAccountsForInvoices(
  slug: string | undefined,
  enabled: boolean,
  ownedOnly: boolean
) {
  const ownedQuery = useQuery({
    queryKey: [`/organizations/${slug}/accounts`, { ownedOnly: true }] as const,
    queryFn: () =>
      http<ListAccounts200>(`/organizations/${slug}/accounts?ownedOnly=true`),
    enabled: !!slug && enabled && ownedOnly,
  })
  const allQuery = useListAccounts(slug, {
    query: { enabled: !!slug && enabled && !ownedOnly },
  })
  return ownedOnly ? ownedQuery : allQuery
}

export function useInvoiceSummaryRows(
  dateFrom: string,
  dateTo: string,
  enabled = true,
  options?: { ownedOnly?: boolean }
) {
  const { slug } = useActiveOrganization()
  const ownedOnly = options?.ownedOnly ?? false
  const accountsQuery = useAccountsForInvoices(slug, enabled, ownedOnly)

  const creditCards = useMemo(
    () => (accountsQuery.data?.accounts ?? []).filter(a => a.type === 'credit_card'),
    [accountsQuery.data?.accounts]
  )

  const extendedFrom = dayjs(dateFrom).subtract(2, 'month').startOf('day').toISOString()
  const extendedTo = dayjs(dateTo).add(1, 'month').endOf('day').toISOString()

  const { data: extendedTxData } = useListTransactions(
    slug,
    {
      dateFrom: extendedFrom,
      dateTo: extendedTo,
      perPage: 500,
      ...(ownedOnly ? { ownedOnly: true } : {}),
    },
    { query: { enabled: !!slug && enabled && creditCards.length > 0 } }
  )

  const statementQueries = useQueries({
    queries: creditCards.map(card => ({
      queryKey: [...getListStatementsQueryKey(slug, card.id), ownedOnly ? 'owned' : 'all'] as const,
      queryFn: () => listStatements(slug, card.id),
      enabled: !!slug && enabled,
    })),
  })

  return useMemo(() => {
    const statementsByAccountId: Record<
      string,
      NonNullable<(typeof statementQueries)[0]['data']>['statements']
    > = {}

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
  const ownedOnly = true
  const accountsQuery = useAccountsForInvoices(slug, enabled, ownedOnly)

  const creditCards = useMemo(
    () => (accountsQuery.data?.accounts ?? []).filter(a => a.type === 'credit_card'),
    [accountsQuery.data?.accounts]
  )

  const extendedFrom = dayjs().subtract(14, 'month').startOf('day').toISOString()
  const extendedTo = dayjs().endOf('day').toISOString()

  const { data: extendedTxData } = useListTransactions(
    slug,
    {
      dateFrom: extendedFrom,
      dateTo: extendedTo,
      perPage: 500,
      ownedOnly: true,
    },
    { query: { enabled: !!slug && enabled && creditCards.length > 0 } }
  )

  const statementQueries = useQueries({
    queries: creditCards.map(card => ({
      queryKey: [...getListStatementsQueryKey(slug, card.id), 'owned-overdue'] as const,
      queryFn: () => listStatements(slug, card.id),
      enabled: !!slug && enabled,
    })),
  })

  return useMemo(() => {
    const statementsByAccountId: Record<
      string,
      NonNullable<(typeof statementQueries)[0]['data']>['statements']
    > = {}

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
