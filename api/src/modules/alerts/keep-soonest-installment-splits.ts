import { stripInstallmentBaseTitle } from '@/core/expense-title'
import { personKey } from '@/modules/splits/split-debt-summary.logic'
import type { PendingSplitNotifyRow } from '@/modules/splits/split.repository'

function upcomingInstallmentSeriesKey(split: PendingSplitNotifyRow): string | null {
  if (split.collectPlanId && (split.collectInstallmentsTotal ?? 0) >= 2) {
    return `collect:${personKey(split)}::${split.collectPlanId}`
  }

  if (
    split.installmentNumber == null ||
    split.installmentsTotal == null ||
    split.installmentsTotal < 2
  ) {
    return null
  }

  const title = stripInstallmentBaseTitle(split.transactionTitle).toLowerCase()
  const amount = split.transactionAmount?.toString() ?? 'null'
  const account = split.accountId ?? 'none'
  const card = split.cardId ?? 'none'
  return `${personKey(split)}::${title}::${split.installmentsTotal}::${amount}::${account}::${card}`
}

/**
 * Manual "upcoming" collects every unpaid split. For installment purchases,
 * only the soonest parcel should be alerted — later ones wait their turn.
 */
export function keepSoonestUpcomingInstallmentSplits(
  splits: PendingSplitNotifyRow[],
  daysUntilDue: (split: PendingSplitNotifyRow) => number
): PendingSplitNotifyRow[] {
  const bestBySeries = new Map<
    string,
    { split: PendingSplitNotifyRow; days: number }
  >()

  for (const split of splits) {
    const days = daysUntilDue(split)
    if (days < 0) continue

    const key = upcomingInstallmentSeriesKey(split)
    if (!key) continue

    const existing = bestBySeries.get(key)
    const installmentNumber =
      split.collectInstallmentNumber ?? split.installmentNumber ?? 0
    if (
      !existing ||
      days < existing.days ||
      (days === existing.days &&
        installmentNumber <
          (existing.split.collectInstallmentNumber ??
            existing.split.installmentNumber ??
            0))
    ) {
      bestBySeries.set(key, { split, days })
    }
  }

  if (bestBySeries.size === 0) return splits

  const kept = new Set(
    [...bestBySeries.values()].map(entry => entry.split.id)
  )
  const droppedSeriesKeys = new Set(bestBySeries.keys())

  return splits.filter(split => {
    const days = daysUntilDue(split)
    if (days < 0) return true

    const key = upcomingInstallmentSeriesKey(split)
    if (!key || !droppedSeriesKeys.has(key)) return true
    return kept.has(split.id)
  })
}
