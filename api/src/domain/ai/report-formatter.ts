import { env } from '@/config/env'
import { logger } from '@/lib/logger'
import { getProvider } from './providers'
import type { ProviderName } from './providers'
import type {
  MonthlySummaryData,
  OverdueAlertsData,
  TransactionAlertsData,
} from './report-context'
import {
  buildMonthlySummaryPrompt,
  buildOverdueAlertsPrompt,
  buildTransactionAlertsPrompt,
} from './report-context'

export type ReportType = 'transaction-alerts' | 'overdue-alerts' | 'monthly-summary'

export type ReportData = TransactionAlertsData | OverdueAlertsData | MonthlySummaryData

async function complete(systemPrompt: string, userMessage: string): Promise<string> {
  const providerName = env.AI_REPORT_PROVIDER as ProviderName
  const provider = getProvider(providerName)

  const messages = [{ role: 'user' as const, content: userMessage }]
  const chunks: string[] = []

  for await (const chunk of provider.stream(messages, systemPrompt)) {
    chunks.push(chunk)
  }

  return chunks.join('').trim()
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fallbackTransactionAlerts(data: TransactionAlertsData): string {
  const lines: string[] = []
  if (data.personName) {
    lines.push(`Olá, *${data.personName}*! Aqui é o HouseBot. 🏠`)
  } else {
    lines.push('Olá! Aqui é o HouseBot. 🏠')
  }
  lines.push('')

  if (data.critical.length > 0) {
    lines.push('🚨 *Vencem HOJE ou AMANHÃ*')
    for (const t of data.critical) {
      const label = t.daysUntilDue === 0 ? 'HOJE' : 'AMANHÃ'
      lines.push(
        `• *${t.title}*${t.installmentInfo ? ` (${t.installmentInfo})` : ''}`
      )
      lines.push(`  ${formatBRL(t.amount)} — ${label}`)
    }
    lines.push('')
  }

  if (data.reminders.length > 0) {
    lines.push('⏰ *Próximos vencimentos*')
    for (const t of data.reminders) {
      lines.push(
        `• *${t.title}*${t.installmentInfo ? ` (${t.installmentInfo})` : ''}`
      )
      lines.push(`  ${formatBRL(t.amount)} — em ${t.daysUntilDue} dias`)
    }
  }

  if (data.organizationSlug) {
    const baseUrl = env.WEB_URL.endsWith('/') ? env.WEB_URL : `${env.WEB_URL}/`
    lines.push('')
    lines.push('---')
    lines.push(`🏠 HouseApp — ${baseUrl}${data.organizationSlug}/transactions`)
  }

  return lines.join('\n')
}

function fallbackOverdueAlerts(data: OverdueAlertsData): string {
  const lines: string[] = []
  if (data.personName) {
    lines.push(`Olá, *${data.personName}*! Aqui é o HouseBot. 🏠`)
  } else {
    lines.push('Olá! Aqui é o HouseBot. 🏠')
  }
  lines.push('')

  if (data.overdue.length === 0) {
    lines.push('✅ Nenhuma transação vencida. Parabéns!')
  } else {
    const total = data.overdue.reduce((sum, t) => sum + t.amount, 0)
    lines.push(`🔻 *${data.overdue.length} transações vencidas*`)
    lines.push(`   Total: ${formatBRL(total)}`)
    lines.push('')
    const sorted = [...data.overdue].sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0))
    const shown = sorted.slice(0, 5)
    for (const t of shown) {
      lines.push(
        `• *${t.title}*${t.installmentInfo ? ` (${t.installmentInfo})` : ''}`
      )
      lines.push(`  ${formatBRL(t.amount)} — ${t.dueDate}`)
    }
    if (sorted.length > 5) {
      lines.push(`  ... e mais ${sorted.length - 5} itens`)
    }
  }

  if (data.organizationSlug) {
    const baseUrl = env.WEB_URL.endsWith('/') ? env.WEB_URL : `${env.WEB_URL}/`
    lines.push('')
    lines.push('---')
    lines.push(`🏠 HouseApp — ${baseUrl}${data.organizationSlug}/transactions`)
  }

  return lines.join('\n')
}

function fallbackMonthlySummary(data: MonthlySummaryData): string {
  const lines: string[] = []
  if (data.personName) {
    lines.push(`Olá, *${data.personName}*! Aqui é o HouseBot. 🏠`)
  } else {
    lines.push('Olá! Aqui é o HouseBot. 🏠')
  }
  lines.push('')
  lines.push(`📊 *Resumo de ${data.headerMonth}*`)
  lines.push('')

  lines.push(`📥 *Receitas*`)
  lines.push(`   Registradas: ${formatBRL(data.kpis.incomeRegistered)}`)
  lines.push(`   Pagas: ${formatBRL(data.kpis.receivedTotal)}`)
  lines.push(`   Em aberto: ${formatBRL(data.kpis.toReceiveTotal)}`)
  lines.push('')
  lines.push(`📤 *Despesas*`)
  lines.push(`   Registradas: ${formatBRL(data.kpis.expenseRegistered)}`)
  lines.push(`   Em aberto: ${formatBRL(data.kpis.toSpendTotal)}`)
  lines.push('')
  lines.push(`💰 *Saldo do mês:* ${formatBRL(data.balance)}`)

  if (data.overdueCount > 0) {
    lines.push('')
    lines.push(`⚠️ *${data.overdueCount} transações vencidas* — ${formatBRL(data.overdueTotal)}`)
  }

  return lines.join('\n')
}

export async function formatReport(
  type: ReportType,
  data: ReportData
): Promise<string> {
  try {
    let systemPrompt: string
    let userMessage: string

    switch (type) {
      case 'transaction-alerts':
        systemPrompt = buildTransactionAlertsPrompt(data as TransactionAlertsData)
        userMessage = 'Formate o relatório de alertas de vencimento para WhatsApp.'
        break
      case 'overdue-alerts':
        systemPrompt = buildOverdueAlertsPrompt(data as OverdueAlertsData)
        userMessage = 'Formate o relatório de transações vencidas para WhatsApp.'
        break
      case 'monthly-summary':
        systemPrompt = buildMonthlySummaryPrompt(data as MonthlySummaryData)
        userMessage = 'Formate o resumo mensal financeiro para WhatsApp.'
        break
      default:
        throw new Error(`Tipo de relatório desconhecido: ${type}`)
    }

    const result = await complete(systemPrompt, userMessage)
    logger.info({ type }, 'Relatório formatado por IA com sucesso')
    return result
  } catch (error) {
    logger.warn({ type, error: String(error) }, 'Falha ao formatar relatório com IA, usando fallback')

    switch (type) {
      case 'transaction-alerts':
        return fallbackTransactionAlerts(data as TransactionAlertsData)
      case 'overdue-alerts':
        return fallbackOverdueAlerts(data as OverdueAlertsData)
      case 'monthly-summary':
        return fallbackMonthlySummary(data as MonthlySummaryData)
      default:
        return 'Erro ao gerar relatório.'
    }
  }
}
