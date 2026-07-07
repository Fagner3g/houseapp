import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export type InvoiceKind = 'partial' | 'closed_unpaid' | 'closed_paid'

/** Billing cycle is still open while today is strictly before the closing date. */
export function isBillingCycleClosed(
  periodEnd: string | Date,
  referenceDate: Date = new Date()
): boolean {
  const closing = dayjs(periodEnd).utc().startOf('day')
  const today = dayjs(referenceDate).utc().startOf('day')

  return !today.isBefore(closing)
}

export type InvoiceStatusDetection = {
  kind: InvoiceKind
  detectedClosed: boolean | null
  closedConfidence: 'high' | 'manual'
  suggestedPaid: boolean
  suggestedPaidReason: string
  importSource: 'pdf' | 'csv' | 'ofx'
  defaultIsClosed: boolean
  defaultIsPaid: boolean
}

export type StatementPaymentLine = {
  type: 'income' | 'expense'
  amount: string
  date: string
}

export function detectClosedFromPdfText(text: string): boolean {
  return (
    /RESUMO DA FATURA ATUAL/i.test(text) &&
    /Total a pagar/i.test(text) &&
    /Período vigente/i.test(text)
  )
}

export function isWithinPaymentWindow(date: Date, periodEnd: Date, dueDate: Date): boolean {
  return date.getTime() >= periodEnd.getTime() && date.getTime() <= dueDate.getTime()
}

export function sumPaymentsInWindow(
  transactions: StatementPaymentLine[],
  periodEnd: Date,
  dueDate: Date
): number {
  return transactions
    .filter(tx => tx.type === 'income')
    .filter(tx => isWithinPaymentWindow(new Date(tx.date), periodEnd, dueDate))
    .reduce((sum, tx) => sum + Number.parseFloat(tx.amount), 0)
}

export function suggestPaidFromStatement(input: {
  totalAmount?: string | null
  periodEnd?: string | null
  dueDate?: string | null
  transactions?: StatementPaymentLine[]
}): {
  suggestedPaid: boolean
  reason: string
} {
  const total = Number.parseFloat(input.totalAmount ?? '0')

  if (!Number.isFinite(total) || total <= 0) {
    return {
      suggestedPaid: true,
      reason: 'Fatura quitada — total a pagar é R$ 0,00 no PDF',
    }
  }

  if (input.periodEnd && input.dueDate && input.transactions?.length) {
    const periodEnd = new Date(input.periodEnd)
    const dueDate = new Date(input.dueDate)
    const paymentsInWindow = sumPaymentsInWindow(input.transactions, periodEnd, dueDate)

    if (paymentsInWindow + 0.009 >= total) {
      return {
        suggestedPaid: true,
        reason: 'Pagamento desta fatura encontrado no arquivo',
      }
    }
  }

  return {
    suggestedPaid: false,
    reason: 'Nenhum pagamento desta fatura encontrado no arquivo',
  }
}

/** @deprecated use suggestPaidFromStatement */
export function suggestPaidFromTotalAmount(totalAmount: string | undefined): {
  suggestedPaid: boolean
  reason: string
} {
  return suggestPaidFromStatement({ totalAmount })
}

export function detectInvoiceStatus(input: {
  provider: string
  extractedText?: string
  totalAmount: string
  periodEnd?: string | null
  dueDate?: string | null
  transactions?: StatementPaymentLine[]
}): InvoiceStatusDetection {
  if (input.provider === 'csv') {
    return {
      kind: 'partial',
      detectedClosed: false,
      closedConfidence: 'high',
      suggestedPaid: false,
      suggestedPaidReason: 'CSV do ciclo atual — compras ainda podem entrar nesta fatura',
      importSource: 'csv',
      defaultIsClosed: false,
      defaultIsPaid: false,
    }
  }

  if (input.provider === 'ofx') {
    const cycleClosed = input.periodEnd
      ? isBillingCycleClosed(input.periodEnd)
      : true

    if (!cycleClosed) {
      return {
        kind: 'partial',
        detectedClosed: false,
        closedConfidence: 'high',
        suggestedPaid: false,
        suggestedPaidReason: 'OFX do ciclo atual — o fechamento ainda não ocorreu',
        importSource: 'ofx',
        defaultIsClosed: false,
        defaultIsPaid: false,
      }
    }

    const { suggestedPaid, reason } = suggestPaidFromStatement({
      totalAmount: input.totalAmount,
      periodEnd: input.periodEnd,
      dueDate: input.dueDate,
      transactions: input.transactions,
    })

    const kind: InvoiceKind = suggestedPaid ? 'closed_paid' : 'closed_unpaid'

    return {
      kind,
      detectedClosed: true,
      closedConfidence: 'high',
      suggestedPaid,
      suggestedPaidReason: reason,
      importSource: 'ofx',
      defaultIsClosed: true,
      defaultIsPaid: suggestedPaid,
    }
  }

  const closed = input.extractedText ? detectClosedFromPdfText(input.extractedText) : false
  const { suggestedPaid, reason } = suggestPaidFromStatement({
    totalAmount: input.totalAmount,
    periodEnd: input.periodEnd,
    dueDate: input.dueDate,
    transactions: input.transactions,
  })

  if (!closed) {
    return {
      kind: 'partial',
      detectedClosed: null,
      closedConfidence: 'manual',
      suggestedPaid: false,
      suggestedPaidReason: 'PDF sem fatura fechada — o ciclo pode ainda estar em andamento',
      importSource: 'pdf',
      defaultIsClosed: false,
      defaultIsPaid: false,
    }
  }

  const kind: InvoiceKind = suggestedPaid ? 'closed_paid' : 'closed_unpaid'

  return {
    kind,
    detectedClosed: true,
    closedConfidence: 'high',
    suggestedPaid,
    suggestedPaidReason: reason,
    importSource: 'pdf',
    defaultIsClosed: true,
    defaultIsPaid: suggestedPaid,
  }
}

/** Credits on a closed invoice PDF already happened — never leave them as pending receivables. */
export function shouldMarkImportedIncomePaid(input: {
  type: 'income' | 'expense'
  isClosed: boolean
  markPaymentsAsPaid: boolean
  inPaymentWindow: boolean
}): boolean {
  if (input.type !== 'income') return false
  if (input.isClosed) return true
  return input.markPaymentsAsPaid && input.inPaymentWindow
}

/** OFX/CSV already include "Pagamento recebido" lines — only PDF may need a synthetic transfer. */
export function shouldCreateSyntheticPaymentOnImport(
  importSource: 'pdf' | 'csv' | 'ofx' | null | undefined
): boolean {
  return importSource === 'pdf'
}

export function isCardStatementCreditTitle(title: string): boolean {
  return /pagamento recebido|pagamento em|crédito de confiança|credito de confianca|estorno|reversão|reversao|iof de volta/i.test(
    title
  )
}

export function computeStatementPaymentRemaining(
  totalAmount: bigint,
  transactions: Array<{ type: 'income' | 'expense'; amount: bigint; date: Date }>,
  periodEnd: Date,
  dueDate: Date
): bigint {
  let paymentsInWindow = 0n

  for (const item of transactions) {
    if (item.type !== 'income') continue
    if (!isWithinPaymentWindow(item.date, periodEnd, dueDate)) continue
    paymentsInWindow += item.amount
  }

  const remaining = totalAmount - paymentsInWindow
  return remaining > 0n ? remaining : 0n
}
