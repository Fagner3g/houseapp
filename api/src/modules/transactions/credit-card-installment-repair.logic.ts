import type { TransactionRecord } from './transaction.repository'
import {
  buildCreditCardInstallments,
  stripInstallmentBaseTitle,
} from './credit-card-installments.logic'

export type InstallmentSeriesGroup = {
  baseTitle: string
  installmentsTotal: number
  rows: TransactionRecord[]
}

export function groupManualInstallmentSeries(rows: TransactionRecord[]): InstallmentSeriesGroup[] {
  const groups = new Map<string, InstallmentSeriesGroup>()

  for (const row of rows) {
    if (row.installmentsTotal == null || row.installmentsTotal < 2) continue
    if (row.source !== 'manual') continue

    const baseTitle = stripInstallmentBaseTitle(row.title)
    const key = `${baseTitle}::${row.installmentsTotal}`
    const existing = groups.get(key)

    if (existing) {
      existing.rows.push(row)
      continue
    }

    groups.set(key, { baseTitle, installmentsTotal: row.installmentsTotal, rows: [row] })
  }

  return [...groups.values()]
}

export function isIncompleteInstallmentSeries(group: InstallmentSeriesGroup): boolean {
  if (group.rows.length >= group.installmentsTotal) return false

  const numbers = new Set(
    group.rows.map(row => row.installmentNumber).filter((value): value is number => value != null)
  )

  return numbers.size < group.installmentsTotal
}

export function resolveInstallmentSeriesTotalCentavos(group: InstallmentSeriesGroup): bigint {
  if (group.rows.length === 1) {
    return group.rows[0]?.amount ?? 0n
  }

  return group.rows.reduce((sum, row) => sum + (row.amount ?? 0n), 0n)
}

export function resolveInstallmentSeriesPurchaseDate(group: InstallmentSeriesGroup): Date {
  const first =
    group.rows.find(row => row.installmentNumber === 1) ??
    group.rows.reduce((earliest, row) => {
      const rowDate = row.competenceDate ?? row.date
      const earliestDate = earliest.competenceDate ?? earliest.date
      return rowDate < earliestDate ? row : earliest
    })

  return first.competenceDate ?? first.date
}

export function buildInstallmentSeriesRepairPlan(
  group: InstallmentSeriesGroup,
  closingDay: number,
  dueDay: number
) {
  const purchaseDate = resolveInstallmentSeriesPurchaseDate(group)
  const totalCentavos = resolveInstallmentSeriesTotalCentavos(group)
  const planned = buildCreditCardInstallments({
    title: group.baseTitle,
    totalCentavos,
    purchaseDate,
    closingDay,
    dueDay,
    installmentsTotal: group.installmentsTotal,
  })

  const existingByNumber = new Map(
    group.rows
      .filter(row => row.installmentNumber != null)
      .map(row => [row.installmentNumber!, row])
  )

  const updates: Array<{ id: string; row: (typeof planned)[number] }> = []
  const creates: Array<(typeof planned)[number]> = []

  for (const row of planned) {
    const existing = existingByNumber.get(row.installmentNumber)
    if (existing) {
      updates.push({ id: existing.id, row })
      continue
    }
    creates.push(row)
  }

  return { updates, creates, purchaseDate, totalCentavos }
}
