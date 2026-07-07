import dayjs from 'dayjs'

import {
  addMonthsPreserveDay,
  getBillingCycle,
  resolveBillingMonthKey,
  shiftBillingMonthByOffset,
} from '@/core/billing-cycle'
import { divideCentavos } from '@/core/money'

export type CreditCardInstallmentRow = {
  title: string
  amount: bigint
  date: Date
  competenceDate: Date
  installmentNumber: number
  installmentsTotal: number
}

export type BuildCreditCardInstallmentsInput = {
  title: string
  totalCentavos: bigint
  purchaseDate: Date
  closingDay: number
  dueDay: number
  installmentsTotal: number
}

export function stripInstallmentBaseTitle(title: string): string {
  return title
    .replace(/\s*-\s*Parcela\s+\d+\/\d+/gi, '')
    .replace(/\s+Parcela\s+\d+\/\d+/gi, '')
    .trim()
}

export function formatInstallmentTitle(
  title: string,
  installmentNumber: number,
  installmentsTotal: number
): string {
  const base = stripInstallmentBaseTitle(title)
  return `${base} - Parcela ${installmentNumber}/${installmentsTotal}`
}

function installmentDateForCycle(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
  installmentNumber: number,
  firstMonthKey: string
): Date {
  if (installmentNumber === 1) {
    return purchaseDate
  }

  const monthKey = shiftBillingMonthByOffset(firstMonthKey, installmentNumber - 1)
  const cycle = getBillingCycle(closingDay, dueDay, monthKey)
  const purchaseDay = dayjs(purchaseDate).date()
  const periodStart = dayjs(cycle.periodStart)
  const day = Math.min(purchaseDay, periodStart.daysInMonth())

  return periodStart.date(day).hour(12).minute(0).second(0).millisecond(0).toDate()
}

export function buildCreditCardInstallments(
  input: BuildCreditCardInstallmentsInput
): CreditCardInstallmentRow[] {
  const { title, totalCentavos, purchaseDate, closingDay, dueDay, installmentsTotal } = input

  if (installmentsTotal < 2) {
    throw new Error('installmentsTotal must be at least 2')
  }

  const amounts = divideCentavos(totalCentavos, installmentsTotal)
  const firstMonthKey = resolveBillingMonthKey(purchaseDate, closingDay, dueDay)

  return amounts.map((amount, index) => {
    const installmentNumber = index + 1
    const date = installmentDateForCycle(
      purchaseDate,
      closingDay,
      dueDay,
      installmentNumber,
      firstMonthKey
    )

    return {
      title: formatInstallmentTitle(title, installmentNumber, installmentsTotal),
      amount,
      date,
      competenceDate: date,
      installmentNumber,
      installmentsTotal,
    }
  })
}

/** Keeps purchase day when shifting months (fallback helper). */
export function shiftPurchaseDate(purchaseDate: Date, months: number): Date {
  return addMonthsPreserveDay(purchaseDate, months)
}
