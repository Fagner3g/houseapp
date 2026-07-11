import { addMonthsPreserveDay } from '@houseapp/finance-core'

import { stripInstallmentBaseTitle } from '@/modules/transactions/credit-card-installments.logic'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

/** Reject parcels that fall more than ~40 days off the expected monthly offset. */
const MAX_INSTALLMENT_DATE_DRIFT_MS = 40 * 24 * 60 * 60 * 1000

export type InstallmentSeriesMatchFields = Pick<
  TransactionRecord,
  'title' | 'installmentsTotal' | 'accountId' | 'cardId' | 'organizationId'
>

export type InstallmentSeriesSiblingFields = InstallmentSeriesMatchFields &
  Pick<TransactionRecord, 'installmentNumber' | 'date' | 'competenceDate' | 'amount'> & {
    id?: string
  }

export function matchesInstallmentSeries(
  candidate: InstallmentSeriesMatchFields,
  anchor: InstallmentSeriesMatchFields
): boolean {
  if (candidate.organizationId !== anchor.organizationId) return false
  if (candidate.installmentsTotal !== anchor.installmentsTotal) return false
  if (candidate.installmentsTotal == null || candidate.installmentsTotal < 2) return false
  if (candidate.accountId !== anchor.accountId) return false
  if (candidate.cardId !== anchor.cardId) return false

  return stripInstallmentBaseTitle(candidate.title) === stripInstallmentBaseTitle(anchor.title)
}

function transactionDate(row: Pick<TransactionRecord, 'date' | 'competenceDate'>): Date {
  return row.competenceDate ?? row.date
}

/** Imported parcels are usually equal; allow ±1 centavo remainder. */
function amountsCompatible(
  left: bigint | null | undefined,
  right: bigint | null | undefined
): boolean {
  if (left == null || right == null) return true
  const diff = left > right ? left - right : right - left
  return diff <= 1n
}

function pickClosestByDate<T extends InstallmentSeriesSiblingFields>(
  group: T[],
  expected: Date
): { row: T; distance: number } {
  let best = group[0] as T
  let bestDistance = Number.POSITIVE_INFINITY
  for (const row of group) {
    const distance = Math.abs(transactionDate(row).getTime() - expected.getTime())
    if (distance < bestDistance) {
      best = row
      bestDistance = distance
    }
  }
  return { row: best, distance: bestDistance }
}

/**
 * Same-merchant installment purchases (e.g. multiple "Supermercados Bh 3x") share
 * title metadata. When candidates collide, keep one row per installment number —
 * preferring the anchor's amount cluster and parcels closest to its monthly offsets.
 */
export function selectInstallmentSeriesSiblings<T extends InstallmentSeriesSiblingFields>(
  candidates: T[],
  anchor: T
): T[] {
  let matched = candidates.filter(candidate => matchesInstallmentSeries(candidate, anchor))
  if (matched.length === 0) return [anchor]

  const installmentsTotal = anchor.installmentsTotal
  if (installmentsTotal == null || installmentsTotal < 2) return [anchor]

  // Two 3x purchases at the same merchant must not share parcels across series.
  const amountKeys = new Set(
    matched.map(row => (row.amount != null ? row.amount.toString() : 'null'))
  )
  if (amountKeys.size > 1 && anchor.amount != null) {
    const sameAmount = matched.filter(row => amountsCompatible(row.amount, anchor.amount))
    if (sameAmount.length > 0) matched = sameAmount
  }

  const byNumber = new Map<number, T[]>()
  for (const row of matched) {
    const number = row.installmentNumber
    if (number == null) continue
    const group = byNumber.get(number) ?? []
    group.push(row)
    byNumber.set(number, group)
  }

  const anchorDate = transactionDate(anchor)
  const anchorNumber = anchor.installmentNumber ?? 1
  const selected: T[] = []

  for (let number = 1; number <= installmentsTotal; number++) {
    const group = byNumber.get(number) ?? []

    if (number === anchorNumber) {
      const self =
        (anchor.id != null ? group.find(row => row.id === anchor.id) : undefined) ??
        group.find(row => row === anchor) ??
        anchor
      selected.push(self)
      continue
    }

    if (group.length === 0) continue

    const expected = addMonthsPreserveDay(anchorDate, number - anchorNumber)
    const { row: best, distance } = pickClosestByDate(group, expected)
    // A lone parcel from another purchase often sits far off the monthly cadence.
    if (distance > MAX_INSTALLMENT_DATE_DRIFT_MS) continue
    selected.push(best)
  }

  return selected.sort(
    (left, right) => (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0)
  )
}
