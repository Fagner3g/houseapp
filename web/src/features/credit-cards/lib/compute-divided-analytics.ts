import dayjs from 'dayjs'

import type { GetReportByCategory200CategoriesItem } from '@/api/generated/model'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { transactionPurchaseDate } from '@/lib/credit-card-invoice-metrics'
import type { PartialSplitBadgeInfo } from '@/features/transactions/lib/split-badge-label'
import { normalizeMerchantTitle } from '@/lib/normalize-merchant-title'

export type DividedAnalyticsMerchant = {
  key: string
  label: string
  total: string
  occurrenceCount: number
  avgAmount: string
  lastDate: string
  isRecurring: boolean
  hasInstallments: boolean
  hasFullyDelegated: boolean
  delegatedToName: string | null
  hasDivided: boolean
  dividedWithName: string | null
}

export function filterDividedExpenseTransactions(
  transactions: ListTransactions200TransactionsItem[],
  dividedTransactionIds: Set<string>
) {
  return transactions.filter(
    transaction =>
      transaction.type === 'expense' && dividedTransactionIds.has(transaction.id)
  )
}

export function aggregateCategoriesFromTransactions(
  transactions: ListTransactions200TransactionsItem[],
  categoryMeta: GetReportByCategory200CategoriesItem[]
): GetReportByCategory200CategoriesItem[] {
  const metaById = new Map(categoryMeta.map(category => [category.categoryId, category]))
  const totals = new Map<string, number>()

  for (const transaction of transactions) {
    const amount = moneyStringToReais(transaction.amount ?? '0')
    if (transaction.categoryIds.length === 0) {
      totals.set('__uncategorized__', (totals.get('__uncategorized__') ?? 0) + amount)
      continue
    }

    for (const categoryId of transaction.categoryIds) {
      totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount)
    }
  }

  const entries = [...totals.entries()]
  const grandTotal = entries.reduce((sum, [, total]) => sum + total, 0)

  return entries
    .map(([categoryId, total]) => {
      const isUncategorized = categoryId === '__uncategorized__'
      const meta = isUncategorized ? null : metaById.get(categoryId)

      return {
        categoryId: isUncategorized ? 'uncategorized' : categoryId,
        name: meta?.name ?? 'Sem categoria',
        color: meta?.color ?? null,
        total: reaisToMoneyString(total),
        percentage: grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0',
      }
    })
    .sort((left, right) => moneyStringToReais(right.total) - moneyStringToReais(left.total))
}

export function aggregateMerchantsFromTransactions(
  transactions: ListTransactions200TransactionsItem[],
  fullyDelegatedById: Map<string, { delegateName: string } | string>,
  partiallyDividedById: Map<string, PartialSplitBadgeInfo> = new Map()
): {
  merchants: DividedAnalyticsMerchant[]
  merchantCount: number
  grandTotal: string
} {
  type MerchantAccumulator = {
    label: string
    total: number
    count: number
    lastDate: string
    hasInstallments: boolean
    hasFullyDelegated: boolean
    delegatedToName: string | null
    hasDivided: boolean
    dividedWithName: string | null
  }

  const byKey = new Map<string, MerchantAccumulator>()

  for (const transaction of transactions) {
    const key = normalizeMerchantTitle(transaction.title)
    const amount = moneyStringToReais(transaction.amount ?? '0')
    const purchaseDate = transactionPurchaseDate(transaction)
    const isFullyDelegated = fullyDelegatedById.has(transaction.id)
    const delegatedEntry = fullyDelegatedById.get(transaction.id)
    const delegatedName =
      typeof delegatedEntry === 'string'
        ? delegatedEntry
        : (delegatedEntry?.delegateName ?? null)
    const isPartiallyDivided = partiallyDividedById.has(transaction.id)
    const dividedName = partiallyDividedById.get(transaction.id)?.splitWithName ?? null
    const hasInstallments = (transaction.installmentsTotal ?? 0) > 1
    const existing = byKey.get(key)

    if (existing) {
      existing.total += amount
      existing.count += 1
      if (dayjs(purchaseDate).isAfter(dayjs(existing.lastDate))) {
        existing.lastDate = purchaseDate
        existing.label = transaction.title
      }
      existing.hasInstallments = existing.hasInstallments || hasInstallments
      existing.hasFullyDelegated = existing.hasFullyDelegated || isFullyDelegated
      if (isFullyDelegated && delegatedName) {
        existing.delegatedToName = delegatedName
      }
      existing.hasDivided = existing.hasDivided || isPartiallyDivided
      if (isPartiallyDivided && dividedName) {
        existing.dividedWithName = dividedName
      }
      continue
    }

    byKey.set(key, {
      label: transaction.title,
      total: amount,
      count: 1,
      lastDate: purchaseDate,
      hasInstallments,
      hasFullyDelegated: isFullyDelegated,
      delegatedToName: isFullyDelegated ? delegatedName : null,
      hasDivided: isPartiallyDivided,
      dividedWithName: isPartiallyDivided ? dividedName : null,
    })
  }

  const merchants = [...byKey.entries()]
    .map(([key, accumulator]) => ({
      key,
      label: accumulator.label
        .replace(/\s*-\s*Parcela \d+\/\d+/gi, '')
        .replace(/\s+Parcela \d+\/\d+/gi, '')
        .trim(),
      total: reaisToMoneyString(accumulator.total),
      occurrenceCount: accumulator.count,
      avgAmount: reaisToMoneyString(
        accumulator.count > 0 ? accumulator.total / accumulator.count : 0
      ),
      lastDate: accumulator.lastDate,
      isRecurring: accumulator.count >= 2,
      hasInstallments: accumulator.hasInstallments,
      hasFullyDelegated: accumulator.hasFullyDelegated,
      delegatedToName: accumulator.delegatedToName,
      hasDivided: accumulator.hasDivided,
      dividedWithName: accumulator.dividedWithName,
    }))
    .sort((left, right) => moneyStringToReais(right.total) - moneyStringToReais(left.total))

  const grandTotalReais = merchants.reduce(
    (sum, merchant) => sum + moneyStringToReais(merchant.total),
    0
  )

  return {
    merchants,
    merchantCount: merchants.length,
    grandTotal: reaisToMoneyString(grandTotalReais),
  }
}
