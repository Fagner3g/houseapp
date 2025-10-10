import { buildAlertMessage } from '@/domain/alerts/message-builder'
import { fetchOverdueTransactionsForAlerts } from '@/domain/alerts/overdue-transactions'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

/**
 * Envia alertas especificamente para transações vencidas
 * Processa uma organização por vez para evitar problemas de contexto
 */
async function sendOverdueAlerts(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('🚀 Iniciando job de alertas de transações vencidas...')

    // Buscar todas as organizações
    const { db } = await import('@/db')
    const { organizations } = await import('@/db/schemas/organization')

    const orgs = await db.select({ slug: organizations.slug }).from(organizations)

    // Processar cada organização individualmente
    for (const org of orgs) {
      try {
        logger.info(`📋 Processando organização: ${org.slug}`)

        // Buscar transações vencidas apenas desta organização
        const overdueTransactions = await fetchOverdueTransactionsForAlerts(org.slug)

        if (overdueTransactions.length === 0) {
          logger.info(`ℹ️ Nenhuma transação vencida encontrada para organização: ${org.slug}`)
          continue // Pular para próxima organização
        }

        logger.info(
          `📊 Encontradas ${overdueTransactions.length} transações vencidas para ${org.slug}`
        )

        // Agrupar por responsável (owner e payTo) para controlar greeting/footer
        const groups = new Map<
          string,
          {
            transactions: typeof overdueTransactions
            userInfo: { name: string | null; phone: string | null }
          }
        >()

        for (const t of overdueTransactions) {
          // Verificar se o usuário tem notificações habilitadas
          if (!t.notificationsEnabled) {
            logger.info(`⚠️ Pulando usuário ${t.payToName} - notificações desabilitadas`)
            continue
          }

          // Adicionar para o owner
          const ownerKey = `owner_${t.payToId ?? 'na'}`
          if (t.payToId) {
            const ownerGroup = groups.get(ownerKey) ?? {
              transactions: [],
              userInfo: { name: t.payToName, phone: t.payToPhone },
            }
            ownerGroup.transactions.push(t)
            groups.set(ownerKey, ownerGroup)
          }
        }

        for (const [, group] of groups) {
          const { transactions, userInfo } = group

          // Ordenar por dias vencidos (mais vencidas primeiro)
          transactions.sort((a, b) => b.overdueDays - a.overdueDays)

          for (let idx = 0; idx < transactions.length; idx++) {
            const t = transactions[idx]
            try {
              const { message } = buildAlertMessage(
                t.title,
                t.amountCents,
                -t.overdueDays, // Dias negativos para indicar vencida
                t.installmentIndex,
                t.installmentsTotal ?? null,
                t.organizationSlug,
                userInfo.name,
                null, // Não incluir bloco de vencidas pois já estamos processando vencidas
                new Date(t.dueDate),
                { includeGreeting: idx === 0, includeFooter: idx === transactions.length - 1 }
              )

              if (userInfo.phone) {
                const result = await sendWhatsAppMessage({ phone: userInfo.phone, message })
                if (result.status === 'sent') {
                  logger.info(
                    `✅ WhatsApp de transação vencida enviado com sucesso para: ${userInfo.phone} (${userInfo.name}) - Org: ${org.slug}`
                  )
                } else {
                  logger.error(
                    `❌ Erro ao enviar WhatsApp de transação vencida para ${userInfo.phone} (${userInfo.name}) - Org: ${org.slug}: ${result.error}`
                  )
                  errors++
                }
              } else {
                logger.info(
                  `⚠️ Pulando envio - telefone vazio para usuário ${userInfo.name} da transação vencida ${t.id} - Org: ${org.slug}`
                )
              }

              processed++
            } catch (error) {
              logger.error(
                `Erro ao processar transação vencida ${t.id} - Org: ${org.slug}: ${String(error)}`
              )
              errors++
            }
          }
        }

        logger.info(`✅ Organização ${org.slug} processada com sucesso`)
      } catch (orgError) {
        logger.error(`❌ Erro ao processar organização ${org.slug}: ${String(orgError)}`)
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
    logger.error(`Erro no job de alertas de transações vencidas: ${String(error)}`)
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

// Registrar o job
jobManager.registerJob(JOB_CONFIGS.OVERDUE_ALERTS, sendOverdueAlerts)

/**
 * Preview das transações vencidas que seriam processadas pelo job (sem enviar mensagens)
 */
export async function previewOverdueAlerts(): Promise<{
  summary: {
    total: number
    overdue: number
  }
  transactions: Array<{
    id: string
    title: string
    amount: number
    dueDate: string
    overdueDays: number
    payToName: string | null
    payToPhone: string | null
    organizationSlug: string
    installmentInfo: string | null
  }>
}> {
  try {
    // Buscar todas as transações vencidas de todas as organizações
    const { db } = await import('@/db')
    const { organizations } = await import('@/db/schemas/organization')

    const orgs = await db.select({ slug: organizations.slug }).from(organizations)

    // Buscar transações vencidas de todas as organizações
    const allOverdueTransactions = []
    for (const org of orgs) {
      const orgOverdue = await fetchOverdueTransactionsForAlerts(org.slug)
      allOverdueTransactions.push(...orgOverdue)
    }

    const overdueTransactions = allOverdueTransactions

    if (overdueTransactions.length === 0) {
      return {
        summary: { total: 0, overdue: 0 },
        transactions: [],
      }
    }

    const transactions = overdueTransactions.map(t => {
      const installmentInfo =
        t.installmentIndex != null && t.installmentsTotal != null
          ? `Parcela ${t.installmentIndex + 1}/${t.installmentsTotal}`
          : null

      return {
        id: t.id,
        title: t.title,
        amount: t.amountCents / 100,
        dueDate: t.dueDate.toISOString(),
        overdueDays: t.overdueDays,
        payToName: t.payToName,
        payToPhone: t.payToPhone,
        organizationSlug: t.organizationSlug,
        installmentInfo,
      }
    })

    return {
      summary: {
        total: overdueTransactions.length,
        overdue: overdueTransactions.length,
      },
      transactions,
    }
  } catch (error) {
    logger.error(`Erro no preview dos alertas de transações vencidas: ${String(error)}`)
    throw error
  }
}

// Export para execução manual
export async function runOverdueAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.OVERDUE_ALERTS.key)
}
