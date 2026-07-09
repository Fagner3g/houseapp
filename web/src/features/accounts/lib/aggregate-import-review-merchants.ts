import dayjs from 'dayjs'

import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { normalizeMerchantTitle } from '@/lib/normalize-merchant-title'

import type {
  ImportReviewRowState,
  ParsedTransactionReviewItem,
} from '../components/import-review-types'

export type ImportReviewMerchantGroup = {
  key: string
  label: string
  total: string
  avgAmount: string
  lastDate: string
  occurrenceCount: number
  isRecurring: boolean
  hasInstallments: boolean
  itemIds: string[]
  reviewItemIds: string[]
  existingCount: number
  reviewCount: number
  approvedCount: number
  uncategorizedCount: number
  /** All review items share the same type (expense or income). */
  uniformType: 'expense' | 'income' | null
}

function stripInstallmentSuffix(title: string): string {
  return title
    .replace(/\s*-\s*Parcela \d+\/\d+/gi, '')
    .replace(/\s+Parcela \d+\/\d+/gi, '')
    .trim()
}

function isReviewItem(item: ParsedTransactionReviewItem): boolean {
  return !item.isDuplicate
}

export function aggregateImportReviewMerchants(
  items: ParsedTransactionReviewItem[],
  rows: Record<string, ImportReviewRowState>
): { merchants: ImportReviewMerchantGroup[]; grandTotal: string } {
  type Accumulator = {
    label: string
    total: number
    count: number
    lastDate: string
    hasInstallments: boolean
    itemIds: string[]
    reviewItemIds: string[]
    existingCount: number
    approvedCount: number
    uncategorizedCount: number
    types: Set<'expense' | 'income'>
  }

  const byKey = new Map<string, Accumulator>()

  for (const item of items) {
    const key = normalizeMerchantTitle(item.title)
    const amount = moneyStringToReais(item.amount ?? '0')
    const needsReview = isReviewItem(item)
    const row = rows[item.id]
    const hasInstallments =
      (item.installmentsTotal ?? 0) > 1 || /parcela \d+\/\d+/i.test(item.title)

    const existing = byKey.get(key)

    if (existing) {
      existing.total += amount
      existing.count += 1
      existing.itemIds.push(item.id)
      existing.types.add(item.type)
      if (dayjs(item.date).isAfter(dayjs(existing.lastDate))) {
        existing.lastDate = item.date
        existing.label = item.title
      }
      existing.hasInstallments = existing.hasInstallments || hasInstallments
      if (needsReview) {
        existing.reviewItemIds.push(item.id)
        if (row?.validated) existing.approvedCount += 1
        if (!row?.categoryId) existing.uncategorizedCount += 1
      } else {
        existing.existingCount += 1
      }
      continue
    }

    byKey.set(key, {
      label: item.title,
      total: amount,
      count: 1,
      lastDate: item.date,
      hasInstallments,
      itemIds: [item.id],
      reviewItemIds: needsReview ? [item.id] : [],
      existingCount: needsReview ? 0 : 1,
      approvedCount: needsReview && row?.validated ? 1 : 0,
      uncategorizedCount: needsReview && !row?.categoryId ? 1 : 0,
      types: new Set([item.type]),
    })
  }

  const merchants = [...byKey.entries()]
    .map(([key, acc]) => {
      const uniformType =
        acc.types.size === 1 ? ([...acc.types][0] ?? null) : null

      return {
        key,
        label: stripInstallmentSuffix(acc.label),
        total: reaisToMoneyString(acc.total),
        avgAmount: reaisToMoneyString(acc.count > 0 ? acc.total / acc.count : 0),
        lastDate: acc.lastDate,
        occurrenceCount: acc.count,
        isRecurring: acc.count >= 2,
        hasInstallments: acc.hasInstallments,
        itemIds: acc.itemIds,
        reviewItemIds: acc.reviewItemIds,
        existingCount: acc.existingCount,
        reviewCount: acc.reviewItemIds.length,
        approvedCount: acc.approvedCount,
        uncategorizedCount: acc.uncategorizedCount,
        uniformType,
      }
    })
    .sort((left, right) => moneyStringToReais(right.total) - moneyStringToReais(left.total))

  const grandTotalReais = merchants.reduce(
    (sum, merchant) => sum + moneyStringToReais(merchant.total),
    0
  )

  return {
    merchants,
    grandTotal: reaisToMoneyString(grandTotalReais),
  }
}

export function formatImportReviewMerchantSubtitle(group: ImportReviewMerchantGroup): string {
  const parts: string[] = []

  if (group.existingCount > 0 && group.reviewCount > 0) {
    parts.push(
      `${group.existingCount} já no sistema · ${group.reviewCount} para revisar`
    )
  } else if (group.existingCount > 0) {
    parts.push(
      group.existingCount === 1
        ? '1 já no sistema'
        : `${group.existingCount} já no sistema`
    )
  } else {
    parts.push(
      group.occurrenceCount === 1
        ? '1 compra nesta fatura'
        : `${group.occurrenceCount} compras nesta fatura`
    )
  }

  if (group.reviewCount > 0 && group.uncategorizedCount > 0) {
    parts.push(
      group.uncategorizedCount === 1
        ? '1 sem categoria'
        : `${group.uncategorizedCount} sem categoria`
    )
  }

  if (group.reviewCount > 0 && group.approvedCount > 0) {
    parts.push(`${group.approvedCount}/${group.reviewCount} aprovados`)
  }

  return parts.join(' · ')
}
