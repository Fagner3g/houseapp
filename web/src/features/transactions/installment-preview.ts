import dayjs from 'dayjs'

import { resolveSplitAmountReais, type SplitMode } from '@/features/accounts/components/import-review-types'
import {
  formatInvoiceLabel,
  getBillingCycle,
  resolveBillingMonthKey,
  shiftBillingMonthByOffset,
} from '@/lib/billing-cycle'
import { reaisToCents, centsToReais, reaisToCentsString } from '@/lib/currency'

import { parseTransactionPeriodicity } from './constants'

export type InstallmentSplitPreview = {
  splitMode: SplitMode
  splitAmountReais: number
}

export type InstallmentPreviewItem = {
  installmentNumber: number
  installmentsTotal: number
  amount: number
  myShareAmount?: number
  splitAmount?: number
  date: string
  label: string
}

export type InstallmentPreviewAccount = {
  type: string
  closingDay?: number | null
  dueDay?: number | null
}

/** Splits total reais into N parts; distributes remainder to the first installments. */
export function divideReais(total: number, parts: number): number[] {
  const totalCents = reaisToCents(total)
  const base = Math.floor(totalCents / parts)
  let remainder = totalCents % parts

  return Array.from({ length: parts }, () => {
    const extra = remainder > 0 ? 1 : 0
    if (remainder > 0) remainder -= 1
    return centsToReais(base + extra)
  })
}

function creditCardInstallmentDate(
  purchaseDate: string,
  closingDay: number,
  dueDay: number,
  installmentNumber: number,
  firstMonthKey: string
): string {
  if (installmentNumber === 1) return purchaseDate

  const monthKey = shiftBillingMonthByOffset(firstMonthKey, installmentNumber - 1)
  const cycle = getBillingCycle(closingDay, dueDay, monthKey)
  const purchaseDay = dayjs(purchaseDate).date()
  const periodStart = dayjs(cycle.periodStart)
  const day = Math.min(purchaseDay, periodStart.daysInMonth())

  return periodStart.date(day).format('YYYY-MM-DD')
}

function periodicInstallmentDate(
  startDate: string,
  frequency: 'weekly' | 'monthly' | 'yearly',
  interval: number,
  installmentNumber: number
): string {
  const offset = installmentNumber - 1
  const base = dayjs(startDate)

  if (frequency === 'weekly') {
    return base.add(offset * interval, 'week').format('YYYY-MM-DD')
  }
  if (frequency === 'yearly') {
    return base.add(offset * interval, 'year').format('YYYY-MM-DD')
  }
  return base.add(offset * interval, 'month').format('YYYY-MM-DD')
}

function creditCardInstallmentLabel(
  date: string,
  closingDay: number,
  dueDay: number
): string {
  const monthKey = resolveBillingMonthKey(date, closingDay, dueDay)
  return formatInvoiceLabel(monthKey)
}

function resolveSplitForInstallment(
  installmentAmount: number,
  installmentNumber: number,
  installmentsTotal: number,
  split: InstallmentSplitPreview
): { splitAmount: number; myShareAmount: number } {
  let splitAmount: number

  if (split.splitMode === 'custom') {
    splitAmount = divideReais(split.splitAmountReais, installmentsTotal)[installmentNumber - 1] ?? 0
  } else {
    splitAmount = resolveSplitAmountReais(
      reaisToCentsString(installmentAmount),
      split.splitMode,
      split.splitAmountReais
    )
  }

  const myShareAmount = centsToReais(
    Math.max(0, reaisToCents(installmentAmount) - reaisToCents(splitAmount))
  )

  return { splitAmount, myShareAmount }
}

function withSplitAmounts(
  item: Omit<InstallmentPreviewItem, 'myShareAmount' | 'splitAmount'>,
  split?: InstallmentSplitPreview | null
): InstallmentPreviewItem {
  if (!split || split.splitMode === 'none') return item

  const { splitAmount, myShareAmount } = resolveSplitForInstallment(
    item.amount,
    item.installmentNumber,
    item.installmentsTotal,
    split
  )

  return { ...item, splitAmount, myShareAmount }
}

export function buildInstallmentPreview(input: {
  totalAmount: number
  installmentsTotal: number
  startDate: string
  periodicity: string
  account?: InstallmentPreviewAccount | null
  isCreditCardExpense?: boolean
  split?: InstallmentSplitPreview | null
}): InstallmentPreviewItem[] | null {
  const {
    totalAmount,
    installmentsTotal,
    startDate,
    periodicity,
    account,
    isCreditCardExpense,
    split,
  } = input

  if (installmentsTotal < 2 || totalAmount <= 0) return null

  const amounts = divideReais(totalAmount, installmentsTotal)
  const { frequency, interval } = parseTransactionPeriodicity(periodicity)
  const isCreditCard =
    isCreditCardExpense &&
    account?.type === 'credit_card' &&
    account.closingDay != null &&
    account.dueDay != null

  if (isCreditCard) {
    const closingDay = account.closingDay!
    const dueDay = account.dueDay!
    const firstMonthKey = resolveBillingMonthKey(startDate, closingDay, dueDay)

    return amounts.map((amount, index) => {
      const installmentNumber = index + 1
      const date = creditCardInstallmentDate(
        startDate,
        closingDay,
        dueDay,
        installmentNumber,
        firstMonthKey
      )

      return withSplitAmounts(
        {
          installmentNumber,
          installmentsTotal,
          amount,
          date,
          label: creditCardInstallmentLabel(date, closingDay, dueDay),
        },
        split
      )
    })
  }

  return amounts.map((amount, index) => {
    const installmentNumber = index + 1
    const date = periodicInstallmentDate(startDate, frequency, interval, installmentNumber)

    return withSplitAmounts(
      {
        installmentNumber,
        installmentsTotal,
        amount,
        date,
        label: dayjs(date).format('DD/MM/YYYY'),
      },
      split
    )
  })
}
