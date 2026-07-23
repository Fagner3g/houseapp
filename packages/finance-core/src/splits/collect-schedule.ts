import { addMonthsPreserveDay } from '../billing-cycle/cycle'
import { FinanceValidationError } from '../errors'
import { divideCentavos } from '../money/centavos'

export type CollectInstallmentScheduleItem = {
  collectInstallmentNumber: number
  amountCentavos: bigint
  dueAt: Date
}

/**
 * Builds a partner collect schedule independent of the purchase installment series.
 * Amounts use divideCentavos; due dates step monthly from startDate.
 */
export function buildCollectInstallmentSchedule(input: {
  totalCentavos: bigint
  installmentsTotal: number
  startDate: Date
}): CollectInstallmentScheduleItem[] {
  const { totalCentavos, installmentsTotal, startDate } = input

  if (!Number.isInteger(installmentsTotal) || installmentsTotal < 2) {
    throw new FinanceValidationError('installmentsTotal must be an integer >= 2')
  }
  if (totalCentavos <= 0n) {
    throw new FinanceValidationError('totalCentavos must be positive')
  }

  const amounts = divideCentavos(totalCentavos, installmentsTotal)
  return amounts.map((amountCentavos, index) => ({
    collectInstallmentNumber: index + 1,
    amountCentavos,
    dueAt: addMonthsPreserveDay(startDate, index),
  }))
}
