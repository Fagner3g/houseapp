import { addMessageFooter } from '@/jobs/utils/message-footer'

export type AlertKind = 'urgent' | 'warning'

export function computeAlertKind(daysUntilDue: number): AlertKind {
  if (daysUntilDue <= 1) return 'urgent'
  return 'warning'
}

export function buildAlertMessage(
  title: string,
  amountCents: number,
  daysUntilDue: number,
  installmentIndex?: number | null,
  installmentsTotal?: number | null,
  organizationSlug?: string,
  personName?: string | null,
  overdueBlock?: string | null,
  dueDate?: Date,
  options?: { includeGreeting?: boolean; includeFooter?: boolean }
) {
  const amount = (amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  const installmentInfo =
    installmentIndex != null && installmentsTotal != null
      ? ` (Parcela ${installmentIndex}/${installmentsTotal})`
      : ''

  // Formatar data de vencimento
  const dueDateFormatted = dueDate
    ? dueDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : ''

  const kind = computeAlertKind(daysUntilDue)

  let message: string
  if (daysUntilDue === 0) {
    message = `🚨🚨 ALERTA CRÍTICO DE VENCIMENTO 🚨🚨\n\n✧ *${title}${installmentInfo}*\n💰 Valor: ${amount}\n📅 Vencimento: HOJE${dueDateFormatted ? ` (${dueDateFormatted})` : ''}\n⏰ Ação necessária: URGENTE`
  } else if (daysUntilDue === 1) {
    message = `🚨 ALERTA URGENTE - VENCIMENTO AMANHÃ 🚨\n\n✧ *${title}${installmentInfo}*\n✧ Valor: ${amount}\n📅 Vencimento: AMANHÃ${dueDateFormatted ? ` (${dueDateFormatted})` : ''}\n⏰ Ação necessária: URGENTE`
  } else {
    message = `Lembrete de Vencimento\n\n✧ *${title}${installmentInfo}*\n✧ Valor: ${amount}\n✧ Vencimento: em ${daysUntilDue} dias${dueDateFormatted ? ` (${dueDateFormatted})` : ''}`
  }

  const greeting = options?.includeGreeting && personName ? `Olá, ${personName}! 👋\n\n` : ''
  const withOverdue = overdueBlock ? `${message}\n\n${overdueBlock}` : message

  const base = greeting + withOverdue
  const finalMessage =
    options?.includeFooter === false ? base : addMessageFooter(base, organizationSlug)

  return { kind, message: finalMessage }
}
