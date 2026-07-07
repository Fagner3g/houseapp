import type { InstallmentSeriesGroup } from './credit-card-installment-repair.logic'
import {
  resolveInstallmentSeriesPurchaseDate,
  resolveInstallmentSeriesTotalCentavos,
} from './credit-card-installment-repair.logic'
import { buildPeriodicInstallments } from './periodic-installments.logic'

export function buildPeriodicInstallmentSeriesRepairPlan(
  group: InstallmentSeriesGroup,
  periodicity?: string | null
) {
  const startDate = resolveInstallmentSeriesPurchaseDate(group)
  const totalCentavos = resolveInstallmentSeriesTotalCentavos(group)
  const planned = buildPeriodicInstallments({
    title: group.baseTitle,
    totalCentavos,
    startDate,
    installmentsTotal: group.installmentsTotal,
    periodicity,
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

  return { updates, creates, startDate, totalCentavos }
}
