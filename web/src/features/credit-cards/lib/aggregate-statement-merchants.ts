import dayjs from 'dayjs'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'
import { formatMoneyString, moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { normalizeMerchantTitle } from '@/lib/normalize-merchant-title'

export type StatementMerchantGroup = {
  key: string
  label: string
  total: string
  lastDate: string
  occurrenceCount: number
  isRecurring: boolean
  hasInstallments: boolean
  transactionIds: string[]
  uniformType: 'expense' | 'income' | null
  uncategorizedCount: number
  dividedCount: number
}

function stripInstallmentSuffix(title: string): string {
  return title
    .replace(/\s*-\s*Parcela \d+\/\d+/gi, '')
    .replace(/\s+Parcela \d+\/\d+/gi, '')
    .trim()
}

export function aggregateStatementMerchants(
  transactions: ListTransactions200TransactionsItem[],
  dividedTransactionIds: Set<string> = new Set()
): StatementMerchantGroup[] {
  type Accumulator = {
    label: string
    total: number
    count: number
    lastDate: string
    hasInstallments: boolean
    transactionIds: string[]
    types: Set<'expense' | 'income'>
    uncategorizedCount: number
    dividedCount: number
  }

  const byKey = new Map<string, Accumulator>()

  for (const transaction of transactions) {
    const key = normalizeMerchantTitle(transaction.title)
    const amount = moneyStringToReais(transaction.amount)
    const signedAmount = transaction.type === 'income' ? amount : -amount
    const hasInstallments =
      (transaction.installmentsTotal ?? 0) > 1 || /parcela \d+\/\d+/i.test(transaction.title)

    const existing = byKey.get(key)

    if (existing) {
      existing.total += signedAmount
      existing.count += 1
      existing.transactionIds.push(transaction.id)
      existing.types.add(transaction.type)
      if (
        transaction.type === 'expense' &&
        !(transaction.categoryIds?.length ?? 0)
      ) {
        existing.uncategorizedCount += 1
      }
      if (dividedTransactionIds.has(transaction.id)) {
        existing.dividedCount += 1
      }
      if (dayjs(transaction.date).isAfter(dayjs(existing.lastDate))) {
        existing.lastDate = transaction.date
        existing.label = transaction.title
      }
      existing.hasInstallments = existing.hasInstallments || hasInstallments
      continue
    }

    byKey.set(key, {
      label: transaction.title,
      total: signedAmount,
      count: 1,
      lastDate: transaction.date,
      hasInstallments,
      transactionIds: [transaction.id],
      types: new Set([transaction.type]),
      uncategorizedCount:
        transaction.type === 'expense' && !(transaction.categoryIds?.length ?? 0) ? 1 : 0,
      dividedCount: dividedTransactionIds.has(transaction.id) ? 1 : 0,
    })
  }

  return [...byKey.entries()]
    .map(([key, acc]) => {
      const uniformType = acc.types.size === 1 ? ([...acc.types][0] ?? null) : null

      return {
        key,
        label: stripInstallmentSuffix(acc.label),
        total: reaisToMoneyString(Math.abs(acc.total)),
        lastDate: acc.lastDate,
        occurrenceCount: acc.count,
        isRecurring: acc.count >= 2,
        hasInstallments: acc.hasInstallments,
        transactionIds: acc.transactionIds,
        uniformType,
        uncategorizedCount: acc.uncategorizedCount,
        dividedCount: acc.dividedCount,
      }
    })
    .sort((left, right) => moneyStringToReais(right.total) - moneyStringToReais(left.total))
}

export function formatStatementMerchantSubtitle(group: StatementMerchantGroup): string {
  const noun =
    group.uniformType === 'income'
      ? group.occurrenceCount === 1
        ? 'lançamento'
        : 'lançamentos'
      : group.occurrenceCount === 1
        ? 'compra'
        : 'compras'

  if (group.occurrenceCount === 1) {
    return `1 ${noun} · ${dayjs(group.lastDate).format('DD/MM/YY')}`
  }

  return `${group.occurrenceCount} ${noun} · última ${dayjs(group.lastDate).format('DD/MM/YY')}`
}

export function resolveStatementGroupCategoryId(
  group: StatementMerchantGroup,
  transactions: ListTransactions200TransactionsItem[]
): string | null {
  const categorizable = transactions.filter(
    transaction =>
      group.transactionIds.includes(transaction.id) &&
      transaction.type === 'expense' &&
      !isCardStatementCreditTitle(transaction.title)
  )
  if (categorizable.length === 0) return null

  const first = categorizable[0]?.categoryIds?.[0] ?? null
  const allSame = categorizable.every(
    transaction => (transaction.categoryIds?.[0] ?? null) === first
  )
  return allSame ? first : null
}

export function statementGroupStatusLabel(group: StatementMerchantGroup): string | null {
  if (group.uncategorizedCount > 0) {
    return group.uncategorizedCount === 1
      ? '1 sem categoria'
      : `${group.uncategorizedCount} sem categoria`
  }
  return null
}

export function getStatementGroupSignedAmount(
  transactions: ListTransactions200TransactionsItem[],
  group: StatementMerchantGroup
): { label: string; className: string } {
  const groupItems = transactions.filter(transaction => group.transactionIds.includes(transaction.id))

  if (group.uniformType === 'income') {
    return {
      label: `+ ${formatMoneyString(group.total)}`,
      className: 'text-emerald-600',
    }
  }

  if (group.uniformType === 'expense') {
    return {
      label: `- ${formatMoneyString(group.total)}`,
      className: 'text-rose-600',
    }
  }

  const netReais = groupItems.reduce((sum, transaction) => {
    const amount = moneyStringToReais(transaction.amount)
    return sum + (transaction.type === 'income' ? amount : -amount)
  }, 0)

  if (netReais === 0) {
    return { label: formatMoneyString('0'), className: 'text-slate-500' }
  }

  const formatted = formatMoneyString(reaisToMoneyString(Math.abs(netReais)))
  if (netReais > 0) {
    return { label: `+ ${formatted}`, className: 'text-emerald-600' }
  }

  return { label: `- ${formatted}`, className: 'text-rose-600' }
}
