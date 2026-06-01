import { formatReport } from '@/domain/ai/report-formatter'
import type { OverdueAlertsData } from '@/domain/ai/report-context'
import { fetchOverdueTransactionsForAlerts } from '@/domain/alerts/overdue-transactions'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function sendOverdueAlerts(userId?: string): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('🚀 Iniciando job de transações vencidas...')

    const { db } = await import('@/db')
    const { organizations } = await import('@/db/schemas/organization')

    const orgs = await db.select({ slug: organizations.slug }).from(organizations)

    for (const org of orgs) {
      try {
        logger.info(`📋 Processando organização: ${org.slug}`)

        const overdueTransactions = await fetchOverdueTransactionsForAlerts(org.slug, userId)

        if (overdueTransactions.length === 0) {
          logger.info(`ℹ️ Nenhuma transação vencida para ${org.slug}`)
          continue
        }

        logger.info(`📊 ${overdueTransactions.length} transações vencidas para ${org.slug}`)

        const groups = new Map<
          string,
          {
            transactions: typeof overdueTransactions
            userInfo: { name: string | null; phone: string | null }
          }
        >()

        for (const t of overdueTransactions) {
          if (!t.notificationsEnabled) {
            logger.info(`⚠️ Pulando ${t.payToName} - notificações desabilitadas`)
            continue
          }

          const phone = t.payToPhone
          if (!phone) continue
          const key = `user_${phone}`
          const group = groups.get(key) ?? {
            transactions: [],
            userInfo: { name: t.payToName, phone },
          }
          group.transactions.push(t)
          groups.set(key, group)
        }

        for (const [, group] of groups) {
          const { transactions, userInfo } = group

          transactions.sort((a, b) => b.overdueDays - a.overdueDays)
          const unique = Array.from(new Map(transactions.map(t => [t.id, t])).values())

          const items: OverdueAlertsData['overdue'] = unique.map(t => {
            const dueDateFormatted = new Date(t.dueDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
            })

            return {
              title: t.title,
              amount: t.amountCents / 100,
              dueDate: dueDateFormatted,
              overdueDays: t.overdueDays,
              installmentInfo:
                t.installmentIndex != null && t.installmentsTotal != null
                  ? `Parcela ${t.installmentIndex}/${t.installmentsTotal}`
                  : null,
            }
          })

          const data: OverdueAlertsData = {
            personName: userInfo.name ?? undefined,
            overdue: items,
            organizationSlug: org.slug,
          }

          const text = await formatReport('overdue-alerts', data)

          if (userInfo.phone) {
            const result = await sendWhatsAppMessage({ phone: userInfo.phone, message: text })
            if (result.status === 'sent') {
              logger.info(
                `✅ WhatsApp de vencidas enviado para: ${userInfo.phone} (${userInfo.name}) - Org: ${org.slug}`
              )
            } else {
              logger.error(
                `❌ Erro ao enviar WhatsApp de vencidas para ${userInfo.phone} - Org: ${org.slug}: ${result.error}`
              )
              errors++
            }
          }

          processed += items.length
        }

        logger.info(`✅ Organização ${org.slug} processada`)
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
    logger.error(`Erro no job de transações vencidas: ${String(error)}`)
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

jobManager.registerJob(JOB_CONFIGS.OVERDUE_ALERTS, sendOverdueAlerts)

export async function previewOverdueAlerts(userId?: string): Promise<{
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
    const { db } = await import('@/db')
    const { organizations } = await import('@/db/schemas/organization')

    const orgs = await db.select({ slug: organizations.slug }).from(organizations)

    const allOverdueTransactions = []
    for (const org of orgs) {
      const orgOverdue = await fetchOverdueTransactionsForAlerts(org.slug, userId)
      allOverdueTransactions.push(...orgOverdue)
    }

    const overdueTransactions = allOverdueTransactions

    if (overdueTransactions.length === 0) {
      return {
        summary: { total: 0, overdue: 0 },
        transactions: [],
      }
    }

    const transactions = overdueTransactions.map(t => ({
      id: t.id,
      title: t.title,
      amount: t.amountCents / 100,
      dueDate: t.dueDate.toISOString(),
      overdueDays: t.overdueDays,
      payToName: t.payToName,
      payToPhone: t.payToPhone,
      organizationSlug: t.organizationSlug,
      installmentInfo:
        t.installmentIndex != null && t.installmentsTotal != null
          ? `Parcela ${t.installmentIndex}/${t.installmentsTotal}`
          : null,
    }))

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

export async function runOverdueAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.OVERDUE_ALERTS.key)
}
