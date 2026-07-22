import { useQueries } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import {
  getListStatementsQueryKey,
  getListTransactionsQueryKey,
  listStatements,
  listTransactions,
  useListAccounts,
  useListPendingSplits,
} from '@/api/generated/api'
import {
  buildOverdueInvoiceSummaries,
  receivablesFromPendingSplits,
} from '@/lib/credit-card-overdue-invoice-rows'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { getSplitRemainingReais } from '../split-debt-summary.utils'

/**
 * Overdue credit-card invoice rows for owned cards.
 * Bank balance open OR receivable from pending splits on a past-due invoice.
 *
 * Receivable path uses listPendingSplits (with accountId) and does not depend on
 * loading every card purchase into the cycle window.
 */
export function useOverdueInvoiceSummaries(enabled = true) {
  const { slug } = useActiveOrganization()

  const { data: accountsData } = useListAccounts(
    slug,
    { ownedOnly: true },
    { query: { enabled: !!slug && enabled } }
  )

  const creditCards = useMemo(
    () => (accountsData?.accounts ?? []).filter(a => a.type === 'credit_card'),
    [accountsData?.accounts]
  )

  const extendedFrom = useMemo(
    () => dayjs().subtract(14, 'month').startOf('day').toISOString(),
    []
  )
  const extendedTo = useMemo(() => dayjs().endOf('day').toISOString(), [])

  const statementQueries = useQueries({
    queries: creditCards.map(card => ({
      queryKey: [...getListStatementsQueryKey(slug, card.id), 'owned-overdue'] as const,
      queryFn: () => listStatements(slug, card.id),
      enabled: !!slug && enabled,
    })),
  })

  const transactionQueries = useQueries({
    queries: creditCards.map(card => ({
      queryKey: [
        ...getListTransactionsQueryKey(slug, {
          accountId: card.id,
          dateFrom: extendedFrom,
          dateTo: extendedTo,
          perPage: 500,
        }),
        'owned-overdue-card',
      ] as const,
      queryFn: () =>
        listTransactions(slug, {
          accountId: card.id,
          dateFrom: extendedFrom,
          dateTo: extendedTo,
          perPage: 500,
        }),
      enabled: !!slug && enabled,
    })),
  })

  const { data: pendingSplitsData } = useListPendingSplits(slug, {
    query: { enabled: !!slug && enabled },
  })

  const statementsLoaded = statementQueries.map(q => q.data?.statements)
  const transactionsLoaded = transactionQueries.map(q => q.data?.transactions)
  const pendingSplits = pendingSplitsData?.splits

  return useMemo(() => {
    const statementsByAccountId: Record<
      string,
      NonNullable<(typeof statementQueries)[0]['data']>['statements']
    > = {}
    const transactions = []

    creditCards.forEach((card, index) => {
      statementsByAccountId[card.id] = statementsLoaded[index] ?? []
      transactions.push(...(transactionsLoaded[index] ?? []))
    })

    return buildOverdueInvoiceSummaries({
      creditCards,
      statementsByAccountId,
      transactions,
      receivables: receivablesFromPendingSplits(
        pendingSplits ?? [],
        (amount, paidAmount) => getSplitRemainingReais({ amount, paidAmount }),
        new Set(creditCards.map(card => card.id))
      ),
    })
  }, [creditCards, statementsLoaded, transactionsLoaded, pendingSplits])
}
