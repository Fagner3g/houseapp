import { useQuery } from '@tanstack/react-query'

import type { ListSplitTransactionIds200 } from '@/api/generated/model'
import type { PartialSplitBadgeInfo } from '@/features/transactions/lib/split-badge-label'
import { moneyStringToReais } from '@/lib/currency'
import { http } from '@/lib/http'

export type SplitBadgeCounterparty = {
  debtorUserId: string | null
  creditorName: string
}

export type DelegatedSplitBadgeInfo = SplitBadgeCounterparty & {
  delegateName: string
}

export type PartialSplitBadgeEntry = PartialSplitBadgeInfo & SplitBadgeCounterparty

export type ViewerShareEntry = {
  amount: number
  remainingAmount: number
}

export type SplitTransactionIdsResult = {
  transactionIds: Set<string>
  fullyDelegatedById: Map<string, DelegatedSplitBadgeInfo>
  fullyDelegatedCount: number
  partiallyDividedById: Map<string, PartialSplitBadgeEntry>
  partiallyDividedCount: number
  splitPaidById: Map<string, number>
  splitRemainingById: Map<string, number>
  /** Remaining amounts the current user can collect (excludes own debtor shares). */
  receivableRemainingById: Map<string, number>
  /** Debtor share of the authenticated user per transaction. */
  viewerShareById: Map<string, ViewerShareEntry>
}

export function toSplitTransactionIdsResult(
  data: ListSplitTransactionIds200
): SplitTransactionIdsResult {
  return {
    transactionIds: new Set(data.transactionIds),
    fullyDelegatedById: new Map(
      data.fullyDelegated.map(item => [
        item.transactionId,
        {
          delegateName: item.delegateName,
          debtorUserId: item.debtorUserId,
          creditorName: item.creditorName,
        },
      ])
    ),
    fullyDelegatedCount: data.fullyDelegated.length,
    partiallyDividedById: new Map(
      data.partiallyDivided.map(item => [
        item.transactionId,
        {
          splitWithName: item.splitWithName,
          splitAmount: item.splitAmount,
          transactionAmount: item.transactionAmount,
          debtorUserId: item.debtorUserId,
          creditorName: item.creditorName,
        },
      ])
    ),
    partiallyDividedCount: data.partiallyDivided.length,
    splitPaidById: new Map(
      data.splitPaidTotals.map(item => [item.transactionId, moneyStringToReais(item.paidAmount)])
    ),
    splitRemainingById: new Map(
      data.splitRemainingTotals.map(item => [
        item.transactionId,
        moneyStringToReais(item.remainingAmount),
      ])
    ),
    receivableRemainingById: new Map(
      data.receivableRemainingTotals.map(item => [
        item.transactionId,
        moneyStringToReais(item.remainingAmount),
      ])
    ),
    viewerShareById: new Map(
      (data.viewerShareTotals ?? []).map(item => [
        item.transactionId,
        {
          amount: moneyStringToReais(item.amount),
          remainingAmount: moneyStringToReais(item.remainingAmount),
        },
      ])
    ),
  }
}

export function getSplitTransactionIdsQueryKey(slug: string) {
  return ['split-transaction-ids', slug] as const
}

export function useSplitTransactionIds(slug: string | undefined, transactionIds: string[]) {
  const sortedIds = [...transactionIds].sort().join(',')

  return useQuery({
    queryKey: slug
      ? ([...getSplitTransactionIdsQueryKey(slug), sortedIds] as const)
      : (['split-transaction-ids', null, sortedIds] as const),
    queryFn: () =>
      http<ListSplitTransactionIds200>(`/organizations/${slug}/splits/transaction-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds }),
      }),
    enabled: !!slug && transactionIds.length > 0,
    select: toSplitTransactionIdsResult,
  })
}
