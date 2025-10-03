import { buildAlertMessage } from '@/domain/alerts/message-builder'
import { fetchOverdueTransactionsForAlerts } from '@/domain/alerts/overdue-transactions'
import { fetchUpcomingTransactionsForAlerts } from '@/domain/alerts/upcoming-transactions'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

/**
 * Envia alertas para transações vencidas ou prestes a vencer
 */
async function sendTransactionAlerts(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('🚀 Iniciando job de alertas de transações...')

    // Buscar transações que vencem em até 4 dias via domínio
    const upcomingTransactions = await fetchUpcomingTransactionsForAlerts([])

    if (upcomingTransactions.length === 0) {
      logger.info('ℹ️ Nenhuma transação encontrada para alertas')
      return {
        success: true,
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      }
    }

    // Normalizar data de hoje para comparação
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Agrupar por responsável (payToPhone) para controlar greeting/footer e evitar duplicar vencidas
    const groups = new Map<string, typeof upcomingTransactions>()
    for (const t of upcomingTransactions) {
      const key = `${t.payToPhone ?? 'na'}`
      const arr = groups.get(key) ?? []
      arr.push(t)
      groups.set(key, arr)
    }

    for (const [, items] of groups) {
      // ordenar por dueDate asc para uma ordem consistente
      items.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))

      for (let idx = 0; idx < items.length; idx++) {
        const t = items[idx]
        try {
          const dueDate = new Date(t.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
          )

          // Vencidas que pertencem à mesma série da transação deste bloco
          const overdueList = t.organizationSlug
            ? await fetchOverdueTransactionsForAlerts(
                t.organizationSlug,
                t.payToId ?? undefined,
                t.seriesId
              )
            : []

          const overdueBlock = overdueList.length
            ? [
                '🔻 Transações Vencidas',
                ...overdueList.slice(0, 5).map(ov => {
                  const amount = (ov.amountCents / 100).toFixed(2)
                  const parcela =
                    ov.installmentIndex != null && ov.installmentsTotal != null
                      ? ` (Parcela ${ov.installmentIndex + 1}/${ov.installmentsTotal})`
                      : ''
                  return `• ${ov.title}${parcela} — R$ ${amount} — há ${ov.overdueDays} dias`
                }),
                overdueList.length > 5 ? `… e mais ${overdueList.length - 5}` : undefined,
              ]
                .filter(Boolean)
                .join('\n')
            : null

          const { message } = buildAlertMessage(
            t.title,
            t.amountCents,
            daysUntilDue,
            t.installmentIndex,
            t.installmentsTotal ?? null,
            t.organizationSlug,
            t.payToName,
            overdueBlock,
            { includeGreeting: idx === 0, includeFooter: idx === items.length - 1 }
          )

          if (t.payToPhone) {
            const result = await sendWhatsAppMessage({ phone: t.payToPhone, message })
            if (result.status === 'sent') {
              logger.info(`✅ WhatsApp enviado com sucesso para: ${t.payToPhone}`)
            } else {
              logger.error(`❌ Erro ao enviar WhatsApp para ${t.payToPhone}: ${result.error}`)
              errors++
            }
          } else {
            logger.info(
              `⚠️ Pulando envio - telefone vazio para usuário responsável da transação ${t.id}`
            )
          }

          processed++
        } catch (error) {
          logger.error(`Erro ao processar transação ${t.id}: ${String(error)}`)
          errors++
        }
      }
    }

    return {
      success: errors === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    logger.error(`Erro no job de alertas de transações: ${String(error)}`)
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Personaliza a mensagem com o nome da pessoa e adiciona o footer
 */
// Registrar o job e utilitários

// Registrar o job
jobManager.registerJob(JOB_CONFIGS.TRANSACTION_ALERTS, sendTransactionAlerts)

/**
 * Preview das transações que seriam processadas pelo job de alertas (sem enviar mensagens)
 */
export async function previewTransactionAlerts(): Promise<{
  summary: {
    total: number
    today: number
    tomorrow: number
    thisWeek: number
    overdue: number
  }
  transactions: Array<{
    id: string
    title: string
    amount: number
    dueDate: string
    daysUntilDue: number
    payToName: string | null
    payToPhone: string | null
    organizationSlug: string
    installmentInfo: string | null
    overdueCount: number
  }>
}> {
  try {
    // Buscar transações que vencem em até 4 dias via domínio
    const upcomingTransactions = await fetchUpcomingTransactionsForAlerts([])

    if (upcomingTransactions.length === 0) {
      return {
        summary: { total: 0, today: 0, tomorrow: 0, thisWeek: 0, overdue: 0 },
        transactions: [],
      }
    }

    // Normalizar data de hoje para comparação
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todayCount = 0
    let tomorrowCount = 0
    let thisWeekCount = 0
    let overdueCount = 0

    const transactions = []

    for (const t of upcomingTransactions) {
      const dueDate = new Date(t.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

      // Contar por categoria
      if (daysUntilDue === 0) todayCount++
      else if (daysUntilDue === 1) tomorrowCount++
      else if (daysUntilDue <= 7) thisWeekCount++

      // Buscar transações vencidas da mesma série
      const overdueList = t.organizationSlug
        ? await fetchOverdueTransactionsForAlerts(
            t.organizationSlug,
            t.payToId ?? undefined,
            t.seriesId
          )
        : []

      overdueCount += overdueList.length

      const installmentInfo =
        t.installmentIndex != null && t.installmentsTotal != null
          ? `Parcela ${t.installmentIndex + 1}/${t.installmentsTotal}`
          : null

      transactions.push({
        id: t.id,
        title: t.title,
        amount: t.amountCents / 100,
        dueDate: t.dueDate.toISOString(),
        daysUntilDue,
        payToName: t.payToName,
        payToPhone: t.payToPhone,
        organizationSlug: t.organizationSlug,
        installmentInfo,
        overdueCount: overdueList.length,
      })
    }

    return {
      summary: {
        total: upcomingTransactions.length,
        today: todayCount,
        tomorrow: tomorrowCount,
        thisWeek: thisWeekCount,
        overdue: overdueCount,
      },
      transactions,
    }
  } catch (error) {
    logger.error(`Erro no preview dos alertas de transações: ${String(error)}`)
    throw error
  }
}

// Export para execução manual
export async function runTransactionAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.TRANSACTION_ALERTS.key)
}
