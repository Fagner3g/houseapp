import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { parseCentavos } from '@/core/money'

dayjs.extend(utc)

export type InvoicePaymentLine = {
  type: 'income' | 'expense'
  title?: string | null
  amount: string | bigint
  date: string | Date
}

export type InvoicePeriod = {
  periodStart: Date
  periodEnd: Date
  dueDate: Date
}

import {
  isImportedBillPaymentTitle,
  isInvoiceSettlementCreditTitle,
} from '@houseapp/finance-core'

/** Nubank OFX uses "Pagamento recebido" for card bill payments. */
export { isImportedBillPaymentTitle, isInvoiceSettlementCreditTitle }

function isWithinPurchasePeriod(date: Date, periodStart: Date, periodEnd: Date): boolean {
  return date.getTime() >= periodStart.getTime() && date.getTime() <= periodEnd.getTime()
}

export function sumSettlementCreditsInPurchasePeriod(
  transactions: InvoicePaymentLine[],
  periodStart: Date,
  periodEnd: Date
): bigint {
  let total = 0n

  for (const tx of transactions) {
    if (tx.type !== 'income') continue
    if (!isInvoiceSettlementCreditTitle(tx.title)) continue

    const creditDate = tx.date instanceof Date ? tx.date : new Date(tx.date)
    if (!isWithinPurchasePeriod(creditDate, periodStart, periodEnd)) continue

    total +=
      typeof tx.amount === 'bigint' ? tx.amount : parseCentavos(String(tx.amount))
  }

  return total
}

export function sumInvoiceSettlementInPeriod(
  transactions: InvoicePaymentLine[],
  periodStart: Date,
  periodEnd: Date,
  dueDate: Date
): bigint {
  return (
    sumBillPaymentsInWindow(transactions, periodEnd, dueDate) +
    sumSettlementCreditsInPurchasePeriod(transactions, periodStart, periodEnd)
  )
}

/** Payment window for a closed invoice: from closing through due date (+1 day for late posting). */
export function previousInvoicePaymentWindow(
  periodEnd: Date,
  dueDate: Date
): { start: Date; end: Date } {
  return {
    start: periodEnd,
    end: dayjs(dueDate).utc().add(1, 'day').endOf('day').toDate(),
  }
}

export function isWithinPreviousInvoicePaymentWindow(
  date: Date,
  periodEnd: Date,
  dueDate: Date
): boolean {
  const { start, end } = previousInvoicePaymentWindow(periodEnd, dueDate)
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

/**
 * Nubank ships the previous invoice payment inside the next OFX export.
 * Example: April bill paid on 08/04 appears in the May OFX (period 01/04–01/05).
 */
export function isCrossInvoiceBillPayment(
  tx: Pick<InvoicePaymentLine, 'type' | 'title' | 'date'>,
  previous: Pick<InvoicePeriod, 'periodEnd' | 'dueDate'>,
  current: Pick<InvoicePeriod, 'periodStart' | 'periodEnd'>
): boolean {
  if (tx.type !== 'income') return false
  if (!isImportedBillPaymentTitle(tx.title)) return false

  const paymentDate = tx.date instanceof Date ? tx.date : new Date(tx.date)

  if (
    !isWithinPreviousInvoicePaymentWindow(
      paymentDate,
      previous.periodEnd,
      previous.dueDate
    )
  ) {
    return false
  }

  return (
    paymentDate.getTime() >= current.periodStart.getTime() &&
    paymentDate.getTime() < current.periodEnd.getTime()
  )
}

export function sumBillPaymentsInWindow(
  transactions: InvoicePaymentLine[],
  periodEnd: Date,
  dueDate: Date
): bigint {
  const { start, end } = previousInvoicePaymentWindow(periodEnd, dueDate)
  let total = 0n

  for (const tx of transactions) {
    if (tx.type !== 'income') continue
    if (!isImportedBillPaymentTitle(tx.title)) continue

    const paymentDate = tx.date instanceof Date ? tx.date : new Date(tx.date)
    if (paymentDate < start || paymentDate > end) continue

    total +=
      typeof tx.amount === 'bigint' ? tx.amount : parseCentavos(String(tx.amount))
  }

  return total
}

export function shouldMarkInvoicePaid(totalAmount: bigint, paymentsTotal: bigint): boolean {
  if (totalAmount <= 0n) return true
  return paymentsTotal + 1n >= totalAmount
}
