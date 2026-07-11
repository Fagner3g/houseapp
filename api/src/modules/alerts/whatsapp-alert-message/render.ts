import {
  emphasizeMoneyInLine,
  emphasizeTitleLine,
  whatsAppBold,
} from './emphasis'
import { pickWhatsAppItemEmoji } from './format'
import {
  buildCreditCardShareTotalLine,
  buildGrandShareTotalLine,
  sumDueShareCentavos,
} from './due-share'
import {
  buildSplitTransactionTitleLine,
  buildSummaryLine,
} from './summary'
import {
  WHATSAPP_CREDIT_CARD_LABEL,
  type WhatsAppAlertBatchItem,
  type WhatsAppBatchRenderUnit,
} from './types'

function creditCardGroupKey(item: WhatsAppAlertBatchItem): string | null {
  const accountName = item.accountName?.trim()
  if (!item.isCreditCardInvoice || !accountName) return null
  return `${accountName}::${item.dueLine}`
}

export function buildWhatsAppBatchRenderUnits(
  items: WhatsAppAlertBatchItem[]
): WhatsAppBatchRenderUnit[] {
  const groups = new Map<string, WhatsAppAlertBatchItem[]>()
  const itemKeys = items.map(item => creditCardGroupKey(item))

  items.forEach((item, index) => {
    const key = itemKeys[index]
    if (!key) return
    const group = groups.get(key)
    if (group) {
      group.push(item)
      return
    }
    groups.set(key, [item])
  })

  const usedGroups = new Set<string>()
  const units: WhatsAppBatchRenderUnit[] = []

  items.forEach((item, index) => {
    const key = itemKeys[index]
    if (!key) {
      units.push({ type: 'single', item })
      return
    }
    if (usedGroups.has(key)) return
    usedGroups.add(key)
    units.push({
      type: 'credit_card_group',
      accountName: item.accountName?.trim() ?? '',
      dueLine: item.dueLine,
      items: groups.get(key) ?? [item],
    })
  })

  return units
}

function resolveItemSummaryLine(item: WhatsAppAlertBatchItem): string | null {
  return (
    item.summaryLine ??
    buildSummaryLine({
      amount: item.amount,
      transactionTotalAmount: item.transactionTotalAmount,
      installmentAmount: item.installmentAmount,
      splitAmount: item.splitAmount,
      splitShareInstallmentAmount: item.splitShareInstallmentAmount,
      splitPaidAmount: item.splitPaidAmount,
      splitRemainingAmount: item.splitRemainingAmount,
      splitParticipantCount: item.splitParticipantCount,
      installmentNumber: item.installmentNumber,
      installmentsTotal: item.installmentsTotal,
      isSplit: item.isSplit,
      collectLumpSum: item.collectLumpSum,
    })
  )
}

function renderWhatsAppBatchItemLines(
  item: WhatsAppAlertBatchItem,
  options?: { includeNote?: boolean }
): string[] {
  const title = emphasizeTitleLine(
    buildSplitTransactionTitleLine({
      title: item.transactionTitle,
      transactionTotalAmount: item.transactionTotalAmount,
      isSplit: item.isSplit,
    })
  )
  const lines = [`${pickWhatsAppItemEmoji(item)} ${title}`]
  const summaryLine = resolveItemSummaryLine(item)
  if (summaryLine) lines.push(emphasizeMoneyInLine(summaryLine))
  if (options?.includeNote !== false && item.note) lines.push(`📝 ${item.note}`)
  return lines
}

function emphasizeTotalLine(line: string | null): string | null {
  return line ? emphasizeMoneyInLine(line) : null
}

export function renderWhatsAppBatchUnitLines(
  unit: WhatsAppBatchRenderUnit,
  options?: { includeShareTotal?: boolean; shareTotalAsGrand?: boolean }
): string[] {
  if (unit.type === 'single') {
    const lines = renderWhatsAppBatchItemLines(unit.item, { includeNote: false })
    lines.push(whatsAppBold(unit.item.dueLine))
    if (unit.item.note) lines.push(`📝 ${unit.item.note}`)
    return lines
  }

  const lines = [`💳 ${WHATSAPP_CREDIT_CARD_LABEL}`, whatsAppBold(unit.dueLine), '']
  unit.items.forEach((item, index) => {
    if (index > 0) lines.push('')
    lines.push(...renderWhatsAppBatchItemLines(item))
  })

  if (options?.includeShareTotal) {
    const shareTotal = sumDueShareCentavos(unit.items)
    const totalLine = emphasizeTotalLine(
      options.shareTotalAsGrand
        ? buildGrandShareTotalLine(shareTotal)
        : buildCreditCardShareTotalLine(shareTotal)
    )
    if (totalLine) {
      lines.push('')
      lines.push(totalLine)
    }
  }

  return lines
}
