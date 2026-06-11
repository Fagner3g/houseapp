import { env } from '@/config/env'
import { logger } from '@/lib/logger'
import { getProvider } from './providers'
import type { ProviderName } from './providers'
import type { MonthlySummaryData } from './report-context'
import { buildMonthlySummaryPrompt } from './report-context'

export type ReportType = 'monthly-summary'

export type ReportData = MonthlySummaryData

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

export async function formatReport(type: ReportType, data: ReportData): Promise<string> {
  try {
    if (type !== 'monthly-summary') {
      throw new Error(`Tipo de relatório desconhecido: ${type}`)
    }

    const systemPrompt = buildMonthlySummaryPrompt(data)
    const userMessage = 'Formate o resumo mensal financeiro para WhatsApp.'

    const result = await complete(systemPrompt, userMessage)
    logger.info({ type }, 'Relatório formatado por IA com sucesso')
    return result
  } catch (error) {
    logger.warn({ type, error: String(error) }, 'Falha ao formatar relatório com IA, usando fallback')

    if (type === 'monthly-summary') {
      return fallbackMonthlySummary(data)
    }

    return 'Erro ao gerar relatório.'
  }
}
