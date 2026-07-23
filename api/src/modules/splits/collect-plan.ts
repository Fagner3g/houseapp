import { createId } from '@paralleldrive/cuid2'
import { buildCollectInstallmentSchedule } from '@houseapp/finance-core'

import { badRequest } from '@/core/errors'
import { parseCentavos } from '@/core/money'
import type { TransactionRecord } from '@/modules/transactions/transaction.repository'

import type { CreateSplitData, SplitRecord, SplitRepository } from './split.repository'

export type CreateCollectPlanInput = {
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  amount: string
  description?: string | null
  notifyEnabled?: boolean
  installmentsTotal: number
  /** ISO date YYYY-MM-DD or datetime */
  startDate: string
}

export function assertCanCreateCollectPlan(transaction: TransactionRecord): void {
  if ((transaction.installmentsTotal ?? 0) > 1) {
    throw badRequest(
      'Collect installment plans are only allowed on one-shot (à vista) purchases'
    )
  }
}

export function buildCollectPlanCreateRows(
  transactionId: string,
  input: CreateCollectPlanInput
): CreateSplitData[] {
  const installmentsTotal = input.installmentsTotal
  if (!Number.isInteger(installmentsTotal) || installmentsTotal < 2) {
    throw badRequest('installmentsTotal must be an integer >= 2')
  }

  const startDate = parseCollectStartDate(input.startDate)
  const schedule = buildCollectInstallmentSchedule({
    totalCentavos: parseCentavos(input.amount),
    installmentsTotal,
    startDate,
  })
  const collectPlanId = createId()

  return schedule.map(item => ({
    transactionId,
    userId: input.userId ?? null,
    contactName: input.contactName ?? null,
    contactPhone: input.contactPhone ?? null,
    contactEmail: input.contactEmail ?? null,
    amount: item.amountCentavos,
    description: input.description ?? null,
    notifyEnabled: input.notifyEnabled,
    collectLumpSum: false,
    dueAt: item.dueAt,
    collectInstallmentNumber: item.collectInstallmentNumber,
    collectInstallmentsTotal: installmentsTotal,
    collectPlanId,
  }))
}

export async function createCollectPlanSplits(
  splitRepository: SplitRepository,
  rows: CreateSplitData[]
): Promise<SplitRecord[]> {
  const created: SplitRecord[] = []
  for (const row of rows) {
    created.push(await splitRepository.create(row))
  }
  return created
}

function parseCollectStartDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) {
    throw badRequest('startDate must be a valid ISO date')
  }
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0))
  if (Number.isNaN(date.getTime())) {
    throw badRequest('startDate must be a valid ISO date')
  }
  return date
}
