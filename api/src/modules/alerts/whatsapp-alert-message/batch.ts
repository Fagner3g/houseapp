import { buildDueLine } from './due'
import { buildGreeting } from './format'
import { buildWhatsAppBatchRenderUnits, renderWhatsAppBatchUnitLines } from './render'
import { buildGrandShareTotalLine, buildSummaryLine, sumDueShareCentavos } from './summary'
import {
  WHATSAPP_BATCH_SEPARATOR,
  type WhatsAppAlertBatchItem,
  type WhatsAppAlertMessageInput,
  type WhatsAppBatchRenderUnit,
} from './types'

function collectUnitItems(unit: WhatsAppBatchRenderUnit): WhatsAppAlertBatchItem[] {
  return unit.type === 'credit_card_group' ? unit.items : [unit.item]
}

function countSplitItems(items: WhatsAppAlertBatchItem[]): number {
  return items.filter(item => item.isSplit).length
}

function unitHasSplitItems(unit: WhatsAppBatchRenderUnit): boolean {
  return countSplitItems(collectUnitItems(unit)) > 0
}

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
  const allItems = units.flatMap(collectUnitItems)
  const showGrandTotal = units.filter(unitHasSplitItems).length >= 2

  units.forEach((unit, index) => {
    if (index > 0) {
      lines.push('')
      lines.push(WHATSAPP_BATCH_SEPARATOR)
      lines.push('')
    }

    if (unit.type === 'credit_card_group') {
      const cardSplitCount = countSplitItems(unit.items)
      const includeShareTotal =
        cardSplitCount >= 2 || (showGrandTotal && cardSplitCount >= 1)
      lines.push(
        ...renderWhatsAppBatchUnitLines(unit, {
          includeShareTotal,
          shareTotalAsGrand: includeShareTotal && !showGrandTotal,
        })
      )
      return
    }

    lines.push(...renderWhatsAppBatchUnitLines(unit))
  })

  if (showGrandTotal) {
    const totalLine = buildGrandShareTotalLine(sumDueShareCentavos(allItems))
    if (totalLine) {
      lines.push('')
      lines.push(totalLine)
    }
  }

  return lines.join('\n')
}
