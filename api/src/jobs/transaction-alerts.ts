import { buildAlertMessage } from '@/domain/alerts/message-builder'
import { fetchUpcomingTransactionsForAlerts } from '@/domain/alerts/upcoming-transactions'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/http/utils/logger'
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

    // Processar cada transação
    for (const t of upcomingTransactions) {
      try {
        const dueDate = new Date(t.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        )

        const { message } = buildAlertMessage(
          t.title,
          t.amountCents,
          daysUntilDue,
          t.installmentIndex,
          t.installmentsTotal ?? null,
          t.organizationSlug,
          t.payToName
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

// Export para execução manual
export async function runTransactionAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.TRANSACTION_ALERTS.key)
}
