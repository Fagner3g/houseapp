import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/pt-br'

import { isPaymentAccountType } from '@/features/accounts/constants'
import { currentBillingMonthKey } from '@/lib/billing-cycle'
import { isInvoicePaymentTitle } from '@/lib/transaction-kpi'

dayjs.extend(customParseFormat)

export type InvoicePaymentTarget = {
  accountId: string
  monthKey: string
  cycleLabel: string
}

export function parseInvoicePaymentMonthKey(title: string): string | null {
  if (!isInvoicePaymentTitle(title)) return null

  const match = title.match(/\s[-–—]\s*([^-–—]+)$/i)
  if (!match) return null

  const label = match[1].trim()
  const parsed = dayjs(label, 'MMMM YYYY', 'pt-br', true)
  if (!parsed.isValid()) return null

  return parsed.format('YYYY-MM')
}

export function parseInvoicePaymentCycleLabel(title: string): string | null {
  if (!isInvoicePaymentTitle(title)) return null

  const match = title.match(/\s[-–—]\s*([^-–—]+)$/i)
  return match?.[1]?.trim() ?? null
}

export function parseInvoicePaymentCardName(title: string): string | null {
  if (!isInvoicePaymentTitle(title)) return null

  const match = title.match(/^pagamento fatura\s+(.+?)\s[-–—]\s/i)
  return match?.[1]?.trim() ?? null
}

export function isCreditCardInvoicePayment(
  tx: { type: string; title: string },
  accountType?: string | null
): boolean {
  return (
    tx.type === 'income' &&
    accountType === 'credit_card' &&
    isInvoicePaymentTitle(tx.title)
  )
}

export function isCheckingInvoicePayment(
  tx: { type: string; title: string },
  accountType?: string | null
): boolean {
  return (
    tx.type === 'expense' &&
    !!accountType &&
    isPaymentAccountType(accountType) &&
    isInvoicePaymentTitle(tx.title)
  )
}

export function isInvoicePaymentTransaction(
  tx: { type: string; title: string },
  accountType?: string | null
): boolean {
  return (
    isCreditCardInvoicePayment(tx, accountType) ||
    isCheckingInvoicePayment(tx, accountType)
  )
}

function findCreditCardByPaymentTitle<
  T extends { id: string; name: string; type: string },
>(title: string, accounts: T[]): T | undefined {
  const cardName = parseInvoicePaymentCardName(title)
  if (!cardName) return undefined

  const creditCards = accounts.filter(account => account.type === 'credit_card')
  return (
    creditCards.find(account => account.name === cardName) ??
    creditCards.find(account => account.name.includes(cardName)) ??
    creditCards.find(account => cardName.includes(account.name))
  )
}

export function resolveInvoicePaymentTarget<
  T extends { id: string; name: string; type: string },
>(
  tx: {
    type: string
    title: string
    accountId: string | null
    transferPairId?: string | null
  },
  accountType: string | null | undefined,
  accounts: T[] = [],
  pairedTransaction?: { accountId: string | null; type: string } | null
): InvoicePaymentTarget | null {
  const monthKey = parseInvoicePaymentMonthKey(tx.title)
  const cycleLabel = parseInvoicePaymentCycleLabel(tx.title)
  if (!monthKey || !cycleLabel) return null

  if (isCreditCardInvoicePayment(tx, accountType) && tx.accountId) {
    return { accountId: tx.accountId, monthKey, cycleLabel }
  }

  if (pairedTransaction?.accountId) {
    const pairedAccount = accounts.find(account => account.id === pairedTransaction.accountId)
    if (pairedAccount?.type === 'credit_card') {
      return {
        accountId: pairedTransaction.accountId,
        monthKey,
        cycleLabel,
      }
    }
  }

  if (isCheckingInvoicePayment(tx, accountType)) {
    const card = findCreditCardByPaymentTitle(tx.title, accounts)
    if (card) {
      return { accountId: card.id, monthKey, cycleLabel }
    }
  }

  return null
}

/** @deprecated Use resolveInvoicePaymentTarget */
export function invoicePaymentViewTarget(
  tx: { type: string; title: string; accountId: string | null },
  accountType?: string | null
): { accountId: string; monthKey: string } | null {
  const target = resolveInvoicePaymentTarget(tx, accountType)
  if (!target) return null
  return { accountId: target.accountId, monthKey: target.monthKey }
}

export function isOnCanonicalInvoiceView(
  pathname: string,
  search: { accountId?: string; month?: string },
  target: InvoicePaymentTarget
): boolean {
  if (!pathname.includes('/accounts')) return false
  if (pathname.match(/\/accounts\/[^/]+$/)) return false
  const activeMonth = search.month ?? currentBillingMonthKey()
  return search.accountId === target.accountId && activeMonth === target.monthKey
}
