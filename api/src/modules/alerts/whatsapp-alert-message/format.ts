import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { WHATSAPP_TIMEZONE } from './types'

dayjs.extend(utc)
dayjs.extend(timezone)

export function buildGreeting(recipientName: string, referenceDate = new Date()): string {
  const hour = dayjs(referenceDate).tz(WHATSAPP_TIMEZONE).hour()
  const firstName = recipientName.trim().split(/\s+/)[0] || recipientName

  if (hour < 12) return `Bom dia, ${firstName}!`
  if (hour < 18) return `Boa tarde, ${firstName}!`
  return `Boa noite, ${firstName}!`
}

export function formatDueDate(dueDate: Date | string): string {
  return dayjs(dueDate).tz(WHATSAPP_TIMEZONE).format('DD/MM/YYYY')
}

export function formatAmountBRL(amount: string | null | undefined): string | null {
  if (!amount) return null

  const [integerPart, fractionalPart = '00'] = amount.split('.')
  const cents = fractionalPart.padEnd(2, '0').slice(0, 2)
  const sign = integerPart.startsWith('-') ? '-' : ''
  const absoluteInteger = integerPart.replace('-', '')
  const withThousands = absoluteInteger.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `R$ ${sign}${withThousands},${cents}`
}

/** Formats money for trailing context (e.g. "837,50") without the R$ prefix. */
export function formatAmountDigitsBRL(amount: string | null | undefined): string | null {
  const formatted = formatAmountBRL(amount)
  return formatted ? formatted.replace(/^R\$\s*/, '') : null
}

export function cleanTransactionTitle(title: string): string {
  return title
    .replace(/\s*[-–—]\s*parcela\s+\d+\s*\/\s*\d+/gi, '')
    .replace(/\s+parcela\s+\d+\s*\/\s*\d+/gi, '')
    .replace(
      /^(?:vence hoje|vence amanhã|vence em \d+ dias|vencido há \d+ dias?|pague hoje|pague amanhã|pague em \d+ dias|você deve hoje|você deve amanhã|você deve em \d+ dias):\s*/i,
      ''
    )
    .trim()
}

export function pickWhatsAppItemEmoji(item: { daysUntilDue: number; kind?: string }): string {
  if (item.kind === 'overdue' || item.kind?.includes('overdue') || item.daysUntilDue < 0) {
    return '⚠️'
  }
  if (item.daysUntilDue === 0) return '📅'
  return '🧾'
}
