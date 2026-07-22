import { eq } from 'drizzle-orm'

import { container } from '@/core/container'
import { db } from '@/db'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { organizations } from '@/db/schemas/organizations'
import { users } from '@/db/schemas/users'
import { formatReport } from '@/domain/ai/report-formatter'
import { normalizePhone, sendWhatsAppMessage } from '@/domain/whatsapp'
import { logger } from '@/lib/logger'
import { areSystemNotificationsEnabled } from '@/modules/system-settings/notifications-enabled'
import { JOB_CONFIGS } from './config'
import { jobManager } from './job-manager'
import type { JobResult } from './types'

async function sendMonthlySummaryJob(): Promise<JobResult> {
  const startTime = Date.now()
  let processed = 0
  let errors = 0

  try {
    if (!(await areSystemNotificationsEnabled())) {
      logger.info('Monthly summary skipped: system notifications disabled')
      return {
        success: true,
        processed: 0,
        errors: 0,
        duration: Date.now() - startTime,
      }
    }

    const orgRows = await db.select().from(organizations)

    for (const org of orgRows) {
      const members = await db
        .select({
          userId: organizationMembers.userId,
          name: users.name,
          phone: users.phone,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(eq(organizationMembers.organizationId, org.id))

      for (const member of members) {
        const phone = normalizePhone(member.phone)

        if (!phone) {
          continue
        }

        try {
          const summaryData = await container.reportService.buildMonthlySummaryData(
            org.id,
            member.userId,
            member.name ?? undefined
          )

          const message = await formatReport('monthly-summary', summaryData)
          const result = await sendWhatsAppMessage({ phone, message })

          if (result.status === 'error') {
            errors += 1
            logger.warn({ orgId: org.id, userId: member.userId, error: result.error }, 'Monthly summary failed')
            continue
          }

          processed += 1
        } catch (error) {
          errors += 1
          logger.warn({ orgId: org.id, userId: member.userId, error: String(error) }, 'Monthly summary failed')
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
    logger.error({ error }, 'Monthly summary job failed')
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
