import type { WhatsAppAlertBatchItem } from './types'

const WHATSAPP_FORMAT_CHARS = /[*_~`]/

export function isOverdueAlertItem(item: {
  daysUntilDue: number
  kind?: string
}): boolean {
  return item.kind === 'overdue' || !!item.kind?.includes('overdue') || item.daysUntilDue < 0
}

/** WhatsApp bold — skip when the text already has formatting markers. */
export function whatsAppBold(text: string): string {
  const trimmed = text.trim()
  if (!trimmed || WHATSAPP_FORMAT_CHARS.test(trimmed)) return text
  return `*${trimmed}*`
}

export function emphasizeMoneyInLine(line: string): string {
  return line.replace(/R\$\s[\d.]+,\d{2}/g, match => `*${match}*`)
}

export function emphasizeTitleLine(titleLine: string): string {
  const separator = ' · '
  const separatorIndex = titleLine.lastIndexOf(separator)
  if (separatorIndex < 0) return whatsAppBold(titleLine)

  const title = titleLine.slice(0, separatorIndex)
  const amount = titleLine.slice(separatorIndex + separator.length)
  return `${whatsAppBold(title)}${separator}${whatsAppBold(amount)}`
}

export function buildUrgencyBanner(items: WhatsAppAlertBatchItem[]): string {
  const overdue = items.length > 0 && items.every(isOverdueAlertItem)
  return overdue ? '🚨 *CONTAS VENCIDAS*' : '⏰ *PRESTES A VENCER*'
}
