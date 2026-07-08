import { buildDueLine } from './due'
import { buildGreeting } from './format'
import { buildWhatsAppBatchRenderUnits, renderWhatsAppBatchUnitLines } from './render'
import { buildSummaryLine } from './summary'
import {
  WHATSAPP_BATCH_SEPARATOR,
  type WhatsAppAlertBatchItem,
  type WhatsAppAlertMessageInput,
} from './types'

export function toWhatsAppBatchItem(input: {
  transactionTitle: string
  dueLine?: string
  amount?: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  splitParticipantCount?: number | null
  note?: string | null
  daysUntilDue: number
  dueDate: Date | string
  kind?: string
  overdueDays?: number | null
  isCreditCardInvoice?: boolean
  installmentNumber?: number | null
  installmentsTotal?: number | null
  accountName?: string | null
  isSplit?: boolean
}): WhatsAppAlertBatchItem {
  const summaryLine = buildSummaryLine({
    amount: input.amount,
    transactionTotalAmount: input.transactionTotalAmount,
    installmentAmount: input.installmentAmount,
    splitAmount: input.splitAmount,
    splitShareInstallmentAmount: input.splitShareInstallmentAmount,
    splitPaidAmount: input.splitPaidAmount,
    splitRemainingAmount: input.splitRemainingAmount,
    splitParticipantCount: input.splitParticipantCount,
    installmentNumber: input.installmentNumber,
    installmentsTotal: input.installmentsTotal,
    isSplit: input.isSplit,
  })

  return {
    transactionTitle: input.transactionTitle,
    summaryLine,
    dueLine:
      input.dueLine ??
      buildDueLine({
        daysUntilDue: input.daysUntilDue,
        dueDate: input.dueDate,
        kind: input.kind,
        overdueDays: input.overdueDays,
        isCreditCardInvoice: input.isCreditCardInvoice,
      }),
    accountName: input.accountName,
    isCreditCardInvoice: input.isCreditCardInvoice,
    amount: input.amount,
    transactionTotalAmount: input.transactionTotalAmount,
    installmentAmount: input.installmentAmount,
    splitAmount: input.splitAmount,
    splitShareInstallmentAmount: input.splitShareInstallmentAmount,
    splitPaidAmount: input.splitPaidAmount,
    splitRemainingAmount: input.splitRemainingAmount,
    splitParticipantCount: input.splitParticipantCount,
    installmentNumber: input.installmentNumber,
    installmentsTotal: input.installmentsTotal,
    isSplit: input.isSplit,
    note: input.note,
    daysUntilDue: input.daysUntilDue,
    kind: input.kind,
  }
}

export function buildWhatsAppAlertMessage(
  input: WhatsAppAlertMessageInput,
  referenceDate = new Date()
): string {
  return buildWhatsAppBatchAlertMessage(
    {
      recipientName: input.recipientName,
      items: [
        toWhatsAppBatchItem({
          transactionTitle: input.transactionTitle,
          amount: input.amount,
          transactionTotalAmount: input.transactionTotalAmount,
          installmentAmount: input.installmentAmount,
          splitAmount: input.splitAmount,
          splitShareInstallmentAmount: input.splitShareInstallmentAmount,
          splitPaidAmount: input.splitPaidAmount,
          splitRemainingAmount: input.splitRemainingAmount,
          splitParticipantCount: input.splitParticipantCount,
          note: input.note,
          daysUntilDue: input.daysUntilDue,
          dueDate: input.dueDate,
          kind: input.kind,
          overdueDays: input.overdueDays,
          isCreditCardInvoice: input.isCreditCardInvoice,
          installmentNumber: input.installmentNumber,
          installmentsTotal: input.installmentsTotal,
          accountName: input.accountName,
          isSplit: input.isSplit,
        }),
      ],
    },
    referenceDate
  )
}

export function buildWhatsAppBatchAlertMessage(
  input: {
    recipientName: string
    items: WhatsAppAlertBatchItem[]
  },
  referenceDate = new Date()
): string {
  const lines = [buildGreeting(input.recipientName, referenceDate), '']
  const units = buildWhatsAppBatchRenderUnits(input.items)

  units.forEach((unit, index) => {
    if (index > 0) {
      lines.push('')
      lines.push(WHATSAPP_BATCH_SEPARATOR)
      lines.push('')
    }

    lines.push(...renderWhatsAppBatchUnitLines(unit))
  })

  return lines.join('\n')
}
