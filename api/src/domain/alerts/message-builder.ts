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
  personName?: string | null
) {
  const amount = (amountCents / 100).toFixed(2)
  const installmentInfo =
    installmentIndex != null && installmentsTotal != null
      ? ` (Parcela ${installmentIndex + 1}/${installmentsTotal})`
      : ''

  const kind = computeAlertKind(daysUntilDue)

  let message: string
  if (daysUntilDue === 0) {
    message = `🚨🚨 ALERTA CRÍTICO DE VENCIMENTO 🚨🚨\n\n📋 *${title}${installmentInfo}*\n💰 Valor: R$ ${amount}\n📅 Vencimento: HOJE\n⏰ Ação necessária: URGENTE`
  } else if (daysUntilDue === 1) {
    message = `🚨 ALERTA URGENTE - VENCIMENTO AMANHÃ 🚨\n\n📋 *${title}${installmentInfo}*\n💰 Valor: R$ ${amount}\n📅 Vencimento: AMANHÃ\n⏰ Ação necessária: URGENTE`
  } else {
    message = `📅 Lembrete de Vencimento\n\n📋 *${title}${installmentInfo}*\n💰 Valor: R$ ${amount}\n📅 Vencimento: em ${daysUntilDue} dias`
  }

  const greeting = personName ? `Olá, ${personName}! 👋\n\n` : ''
  return {
    kind,
    message: addMessageFooter(greeting + message, organizationSlug),
  }
}
