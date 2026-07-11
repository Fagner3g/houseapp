import { cleanTransactionTitle } from './format'
import type { WhatsAppAlertBatchItem } from './types'

/** Groups installment siblings so a batch lists only the soonest parcel. */
function installmentSeriesKey(item: WhatsAppAlertBatchItem): string | null {
  if (
    !item.installmentNumber ||
    !item.installmentsTotal ||
    item.installmentsTotal < 2
  ) {
    return null
  }

  const title = cleanTransactionTitle(item.transactionTitle).toLowerCase()
  const purchaseTotal = item.transactionTotalAmount ?? ''
  const account = item.accountName?.trim().toLowerCase() ?? ''
  return `${title}::${item.installmentsTotal}::${purchaseTotal}::${account}`
}

function isSoonerInstallment(
  candidate: WhatsAppAlertBatchItem,
  current: WhatsAppAlertBatchItem
): boolean {
  if (candidate.daysUntilDue !== current.daysUntilDue) {
    return candidate.daysUntilDue < current.daysUntilDue
  }
  return (candidate.installmentNumber ?? 0) < (current.installmentNumber ?? 0)
}

/**
 * When a purchase is split across installments, upcoming alerts may include
 * every unpaid parcel. Keep only the soonest one per series in the batch.
 */
export function collapseInstallmentSeriesItems(
  items: WhatsAppAlertBatchItem[]
): WhatsAppAlertBatchItem[] {
  const bestBySeries = new Map<string, WhatsAppAlertBatchItem>()

  for (const item of items) {
    const key = installmentSeriesKey(item)
    if (!key) continue

    const existing = bestBySeries.get(key)
    if (!existing || isSoonerInstallment(item, existing)) {
      bestBySeries.set(key, item)
    }
  }

  if (bestBySeries.size === 0) return items

  const emitted = new Set<WhatsAppAlertBatchItem>()
  const result: WhatsAppAlertBatchItem[] = []

  for (const item of items) {
    const key = installmentSeriesKey(item)
    if (!key) {
      result.push(item)
      continue
    }

    const best = bestBySeries.get(key)
    if (best && !emitted.has(best)) {
      result.push(best)
      emitted.add(best)
    }
  }

  return result
}
