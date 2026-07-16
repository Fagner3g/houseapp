import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'

import { isOverduePayable } from './payable-status'

function isUnpaidOpenInstallment(
  item: GetInstallmentSeries200InstallmentsItem
): boolean {
  return (
    item.status !== 'paid' &&
    item.status !== 'canceled' &&
    Number.parseFloat(item.remaining) > 0
  )
}

export function listFutureUnpaidInstallments(
  installments: GetInstallmentSeries200InstallmentsItem[],
  currentInstallmentNumber: number
): GetInstallmentSeries200InstallmentsItem[] {
  return installments.filter(
    item =>
      item.installmentNumber > currentInstallmentNumber &&
      isUnpaidOpenInstallment(item)
  )
}

/** Prior open parcels that are past due (available to settle with the current one). */
export function listPriorOverdueUnpaidInstallments(
  installments: GetInstallmentSeries200InstallmentsItem[],
  currentInstallmentNumber: number
): GetInstallmentSeries200InstallmentsItem[] {
  return installments
    .filter(
      item =>
        item.installmentNumber < currentInstallmentNumber &&
        isUnpaidOpenInstallment(item) &&
        isOverduePayable({ status: item.status, date: item.date })
    )
    .sort((a, b) => a.installmentNumber - b.installmentNumber)
}

/** Overdue priors first, then future unpaid — excludes the current parcel. */
export function listSettlementExtraInstallments(
  installments: GetInstallmentSeries200InstallmentsItem[],
  currentInstallmentNumber: number
): GetInstallmentSeries200InstallmentsItem[] {
  return [
    ...listPriorOverdueUnpaidInstallments(installments, currentInstallmentNumber),
    ...listFutureUnpaidInstallments(installments, currentInstallmentNumber),
  ]
}

export function isSettlementExtraOverdue(
  item: GetInstallmentSeries200InstallmentsItem,
  currentInstallmentNumber: number
): boolean {
  return (
    item.installmentNumber < currentInstallmentNumber &&
    isOverduePayable({ status: item.status, date: item.date })
  )
}
