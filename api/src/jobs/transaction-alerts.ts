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

    // Agrupar por responsável (owner e payTo) para controlar greeting/footer e evitar duplicar vencidas
    const groups = new Map<
      string,
      {
        transactions: typeof upcomingTransactions
        userInfo: { name: string | null; phone: string | null }
      }
    >()

    for (const t of upcomingTransactions) {
      // SEMPRE adicionar para o owner
      const ownerKey = `owner_${t.ownerPhone ?? 'na'}`
      if (t.ownerPhone) {
        const ownerGroup = groups.get(ownerKey) ?? {
          transactions: [],
          userInfo: { name: t.ownerName, phone: t.ownerPhone },
        }
        ownerGroup.transactions.push(t)
        groups.set(ownerKey, ownerGroup)
      }

      // SEMPRE adicionar para o payTo (mesmo que seja a mesma pessoa)
      if (t.payToPhone) {
        const payToKey = `payto_${t.payToPhone}`
        const payToGroup = groups.get(payToKey) ?? {
          transactions: [],
          userInfo: { name: t.payToName, phone: t.payToPhone },
        }
        payToGroup.transactions.push(t)
        groups.set(payToKey, payToGroup)
      }
    }

    for (const [, group] of groups) {
      const { transactions, userInfo } = group

      // ordenar por dueDate asc para uma ordem consistente
      transactions.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))

      for (let idx = 0; idx < transactions.length; idx++) {
        const t = transactions[idx]
        try {
          const dueDate = new Date(t.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
          )

          // Buscar TODAS as transações vencidas do usuário (não apenas da mesma série)
          const overdueList = t.organizationSlug
            ? await fetchOverdueTransactionsForAlerts(
                t.organizationSlug,
                userInfo.phone === t.ownerPhone ? t.ownerId : (t.payToId ?? undefined)
                // Removido t.seriesId para buscar todas as séries vencidas
              )
            : []

          const overdueBlock = overdueList.length
            ? [
                '🔻 Transações Vencidas',
                ...overdueList
                  .sort((a, b) => {
                    // Ordenar por: 1) dias vencidos (mais vencidas primeiro), 2) data de vencimento
                    if (a.overdueDays !== b.overdueDays) {
                      return b.overdueDays - a.overdueDays
                    }
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
                  })
                  .slice(0, 5)
                  .map(ov => {
                    const amount = (ov.amountCents / 100).toFixed(2)
                    const parcela =
                      ov.installmentIndex != null && ov.installmentsTotal != null
                        ? ` (Parcela ${ov.installmentIndex}/${ov.installmentsTotal})`
                        : ''
                    const dueDateFormatted = new Date(ov.dueDate).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                    return `   \n✧ *${ov.title}${parcela}*\n✧ R$ ${amount}\n✧ Vencida em ${dueDateFormatted} (há ${ov.overdueDays} dias)`
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
            userInfo.name,
            overdueBlock,
            new Date(t.dueDate),
            { includeGreeting: idx === 0, includeFooter: idx === transactions.length - 1 }
          )

          if (userInfo.phone) {
            const result = await sendWhatsAppMessage({ phone: userInfo.phone, message })
            if (result.status === 'sent') {
              logger.info(
                `✅ WhatsApp enviado com sucesso para: ${userInfo.phone} (${userInfo.name})`
              )
            } else {
              logger.error(
                `❌ Erro ao enviar WhatsApp para ${userInfo.phone} (${userInfo.name}): ${result.error}`
              )
              errors++
            }
          } else {
            logger.info(
              `⚠️ Pulando envio - telefone vazio para usuário ${userInfo.name} da transação ${t.id}`
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
