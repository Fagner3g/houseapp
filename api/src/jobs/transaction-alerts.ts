import { formatReport } from '@/domain/ai/report-formatter'
import type { TransactionAlertsData } from '@/domain/ai/report-context'
import { fetchUpcomingTransactionsForAlerts } from '@/domain/alerts/upcoming-transactions'
import { sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function sendTransactionAlerts(userId?: string): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('🚀 Iniciando job de alertas de transações...')

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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

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

      transactions.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))

      const seenIds = new Set<string>()
      const critical: TransactionAlertsData['critical'] = []
      const reminders: TransactionAlertsData['reminders'] = []

      for (const t of transactions) {
        if (seenIds.has(t.id)) continue
        seenIds.add(t.id)

        const dueDate = new Date(t.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        )

        const amount = t.amountCents / 100
        const dueDateFormatted = new Date(t.dueDate).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })

        const item = {
          title: t.title,
          amount,
          dueDate: dueDateFormatted,
          daysUntilDue,
          installmentInfo:
            t.installmentIndex != null && t.installmentsTotal != null
              ? `Parcela ${t.installmentIndex}/${t.installmentsTotal}`
              : null,
        }

        if (daysUntilDue <= 1) critical.push(item)
        else reminders.push(item)

        processed++
      }

      if (critical.length === 0 && reminders.length === 0) continue

      const orgSlug = transactions[0]?.organizationSlug ?? undefined

      const data: TransactionAlertsData = {
        personName: userInfo.name ?? undefined,
        critical,
        reminders,
        organizationSlug: orgSlug,
      }

      const text = await formatReport('transaction-alerts', data)

      if (userInfo.phone) {
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

jobManager.registerJob(JOB_CONFIGS.TRANSACTION_ALERTS, sendTransactionAlerts)

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
    const upcomingTransactions = await fetchUpcomingTransactionsForAlerts([], userId)

    if (upcomingTransactions.length === 0) {
      return {
        summary: { total: 0, today: 0, tomorrow: 0, thisWeek: 0, overdue: 0 },
        transactions: [],
      }
    }

    const uniqueTransactions = new Map<string, (typeof upcomingTransactions)[number]>()
    for (const t of upcomingTransactions) {
      uniqueTransactions.set(t.id, t)
    }
    const deduplicatedTransactions = Array.from(uniqueTransactions.values())

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

      if (daysUntilDue === 0) todayCount++
      else if (daysUntilDue === 1) tomorrowCount++
      else if (daysUntilDue <= 7) thisWeekCount++

      const { fetchOverdueTransactionsForAlerts } = await import('@/domain/alerts/overdue-transactions')
      const overdueList = t.organizationSlug
        ? await fetchOverdueTransactionsForAlerts(
            t.organizationSlug,
            t.payToId ?? undefined,
            t.seriesId
          )
        : []

      overdueCount += overdueList.length

      transactions.push({
        id: t.id,
        title: t.title,
        amount: t.amountCents / 100,
        dueDate: t.dueDate.toISOString(),
        daysUntilDue,
        payToName: t.payToName,
        payToPhone: t.payToPhone,
        organizationSlug: t.organizationSlug,
        installmentInfo:
          t.installmentIndex != null && t.installmentsTotal != null
            ? `Parcela ${t.installmentIndex}/${t.installmentsTotal}`
            : null,
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

export async function runTransactionAlertsNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.TRANSACTION_ALERTS.key)
}
