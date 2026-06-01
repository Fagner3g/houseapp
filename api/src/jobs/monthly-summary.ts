import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { formatReport } from '@/domain/ai/report-formatter'
import type { MonthlySummaryData } from '@/domain/ai/report-context'
import { getTransactionReports } from '@/domain/reports/dashboard'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function sendMonthlySummaryToUser(
  orgId: string,
  userId: string,
  userName: string | null,
  phone: string
): Promise<boolean> {
  try {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastDayOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)

    const reports = await getTransactionReports(orgId, userId, lastDayOfMonth)

    const k = reports.reports.kpis
    const headerMonth = lastDayOfMonth.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })

    const overdueSummary = reports.reports.overdueTransactions
    const overdueTotal = overdueSummary.transactions.reduce(
      (sum: number, t: { amount: number }) => sum + t.amount,
      0
    )

    const data: MonthlySummaryData = {
      personName: userName ?? undefined,
      headerMonth,
      kpis: {
        incomeRegistered: k?.incomeRegistered ?? 0,
        expenseRegistered: k?.expenseRegistered ?? 0,
        receivedTotal: k?.receivedTotal ?? 0,
        toReceiveTotal: k?.toReceiveTotal ?? 0,
        toSpendTotal: k?.toSpendTotal ?? 0,
      },
      balance: (k?.incomeRegistered ?? 0) - (k?.expenseRegistered ?? 0),
      topExpenses: reports.reports.counterparties.toPay.slice(0, 5),
      topReceivables: reports.reports.counterparties.toReceive.slice(0, 5),
      overdueCount: overdueSummary.summary.total,
      overdueTotal,
    }

    const message = await formatReport('monthly-summary', data)
    const result = await sendWhatsAppMessage({ phone, message })

    if (result.status === 'sent') {
      logger.info(`✅ Resumo mensal enviado para: ${phone} (${userName})`)
      return true
    }

    logger.error(`❌ Erro ao enviar resumo mensal para ${phone}: ${result.error}`)
    return false
  } catch (error) {
    logger.error(`Erro no resumo mensal para ${userName}: ${String(error)}`)
    return false
  }
}

async function sendMonthlySummaryJob(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    logger.info('📊 Iniciando job de resumo mensal...')

    const orgs = await db.select({ id: organizations.id, slug: organizations.slug }).from(organizations)

    for (const org of orgs) {
      try {
        const members = await db
          .select({
            id: users.id,
            name: users.name,
            phone: users.phone,
          })
          .from(users)
          .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
          .where(eq(userOrganizations.organizationId, org.id))

        for (const user of members) {
          const phone = normalizePhone(user.phone)
          if (!phone) {
            logger.info(`⚠️ ${user.name} sem telefone — pulando`)
            continue
          }

          const sent = await sendMonthlySummaryToUser(org.id, user.id, user.name, phone)
          if (sent) processed++
          else errors++
        }
      } catch (orgError) {
        logger.error(`❌ Erro ao processar org ${org.slug}: ${String(orgError)}`)
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
    logger.error(`Erro no job de resumo mensal: ${String(error)}`)
    return {
      success: false,
      processed,
      errors: errors + 1,
      duration: Date.now() - startTime,
    }
  }
}

jobManager.registerJob(JOB_CONFIGS.MONTHLY_SUMMARY, sendMonthlySummaryJob)

export async function runMonthlySummaryNow(): Promise<JobResult | null> {
  return await jobManager.runJobNow(JOB_CONFIGS.MONTHLY_SUMMARY.key)
}
