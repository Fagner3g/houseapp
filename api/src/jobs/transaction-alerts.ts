// import { buildAlertMessage } from '@/domain/alerts/message-builder'
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
async function sendTransactionAlerts(userId?: string): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('🚀 Iniciando job de alertas de transações...')

    // Buscar transações que vencem em até 4 dias via domínio
    const upcomingTransactions = await fetchUpcomingTransactionsForAlerts([], userId)

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

    // Agrupar por telefone (evita duplicar quando owner e payTo são a mesma pessoa)
    const groups = new Map<
      string,
      {
        transactions: typeof upcomingTransactions
        userInfo: { name: string | null; phone: string | null }
      }
    >()

    for (const t of upcomingTransactions) {
      const phones = [t.ownerPhone, t.payToPhone].filter(Boolean) as string[]
      const uniquePhones = Array.from(new Set(phones))
      for (const phone of uniquePhones) {
        const key = `user_${phone}`
        const name = phone === t.ownerPhone ? t.ownerName : t.payToName
        const group = groups.get(key) ?? { transactions: [], userInfo: { name, phone } }
        group.transactions.push(t)
        groups.set(key, group)
      }
    }

    for (const [, group] of groups) {
      const { transactions, userInfo } = group

      // ordenar por dueDate asc para uma ordem consistente
      transactions.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))

      // evitar itens duplicados (pode vir duplicado quando owner/payTo são a mesma pessoa
      const seenIds = new Set<string>()

      const criticalMessages: string[] = []
      const reminderMessages: string[] = []
      let overdueBlock: string | null = null

      for (const t of transactions) {
        if (seenIds.has(t.id)) continue
        seenIds.add(t.id)
        try {
          const dueDate = new Date(t.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
          )

          // Buscar TODAS as transações vencidas do usuário (não apenas da mesma série)
          if (overdueBlock === null && t.organizationSlug) {
            // Identificar o userId correto baseado no telefone
            const targetUserId = userInfo.phone === t.ownerPhone ? t.ownerId : t.payToId
            const overdueListRaw = await fetchOverdueTransactionsForAlerts(
              t.organizationSlug,
              targetUserId ?? undefined
            )
            // Deduplicar por ocorrência (pode haver duplicidade pelo join de userOrganizations)
            const overdueList = Array.from(new Map(overdueListRaw.map(ov => [ov.id, ov])).values())

            overdueBlock = overdueList.length
              ? [
                  '🔻 Transações Vencidas',
                  ...overdueList
                    .sort((a, b) => {
                      if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays
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
                      return `   \n✧ *${ov.title}${parcela}*\n✧ Valor: ${amount}\n✧ Vencida em ${dueDateFormatted} (há ${ov.overdueDays} dias)`
                    }),
                  overdueList.length > 5 ? `… e mais ${overdueList.length - 5}` : undefined,
                ]
                  .filter(Boolean)
                  .join('\n')
              : null
          }

          // Montar linha compacta por transação (sem repetir cabeçalhos)
          const amount = (t.amountCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })
          const parcela =
            t.installmentIndex != null && t.installmentsTotal != null
              ? ` (Parcela ${t.installmentIndex}/${t.installmentsTotal})`
              : ''
          const dateFormatted = new Date(t.dueDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          })
          const dateLabel =
            daysUntilDue === 0
              ? `Vence HOJE (${dateFormatted})`
              : daysUntilDue === 1
                ? `Vence AMANHÃ (${dateFormatted})`
                : `Vence em ${dateFormatted} (em ${daysUntilDue} dias)`
          const line = `✧ *${t.title}${parcela}*\n✧ Valor: ${amount}\n✧ ${dateLabel}`

          if (daysUntilDue <= 1) criticalMessages.push(line)
          else reminderMessages.push(line)

          processed++
        } catch (error) {
          logger.error(`Erro ao processar transação ${t.id}: ${String(error)}`)
          errors++
        }
      }

      // Enviar mensagens agrupadas por usuário
      const sendBatch = async (text: string | null) => {
        if (!text || !userInfo.phone) return
        const result = await sendWhatsAppMessage({ phone: userInfo.phone, message: text })
        if (result.status !== 'sent') {
          logger.error(
            `❌ Erro ao enviar WhatsApp para ${userInfo.phone} (${userInfo.name}): ${result.error}`
          )
          errors++
        } else {
          logger.info(`✅ WhatsApp enviado com sucesso para: ${userInfo.phone} (${userInfo.name})`)
        }
      }

      if (criticalMessages.length > 0) {
        const text = [
          '🚨🚨 ALERTAS CRÍTICOS DE VENCIMENTO 🚨🚨',
          '',
          criticalMessages.join('\n\n'),
        ].join('\n')
        await sendBatch(text)
      }

      if (reminderMessages.length > 0) {
        const text = ['⏰ Lembretes de vencimento', '', reminderMessages.join('\n\n')].join('\n')
        await sendBatch(text)
      }

      if (overdueBlock) {
        await sendBatch(overdueBlock)
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
export async function previewTransactionAlerts(userId?: string): Promise<{
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
    const upcomingTransactions = await fetchUpcomingTransactionsForAlerts([], userId)

    if (upcomingTransactions.length === 0) {
      return {
        summary: { total: 0, today: 0, tomorrow: 0, thisWeek: 0, overdue: 0 },
        transactions: [],
      }
    }

    // Deduplicate transactions by ID
    const uniqueTransactions = new Map<string, (typeof upcomingTransactions)[number]>()
    for (const t of upcomingTransactions) {
      uniqueTransactions.set(t.id, t)
    }
    const deduplicatedTransactions = Array.from(uniqueTransactions.values())

    // Normalizar data de hoje para comparação
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todayCount = 0
    let tomorrowCount = 0
    let thisWeekCount = 0
    let overdueCount = 0

    const transactions = []

    for (const t of deduplicatedTransactions) {
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
        total: deduplicatedTransactions.length,
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
