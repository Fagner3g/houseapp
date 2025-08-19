import cron from 'node-cron'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { db } from '@/db'
import { notificationPolicies } from '@/db/schemas/notificationPolicies'
import { notificationState } from '@/db/schemas/notificationState'
import { notificationRuns } from '@/db/schemas/notificationRuns'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'
import { and, eq, gte, lt, lte, sql } from 'drizzle-orm'
import { isWithinQuietHours, calculateNextEligibleAt } from './utils'
import { mailer } from '@/providers/mailer'
import { env } from '@/config/env'

dayjs.extend(utc)
dayjs.extend(timezone)

const WINDOW_MINUTES = 5

export async function runSchedulerTick(orgId: string) {
  const now = new Date()

  const policies = await db
    .select()
    .from(notificationPolicies)
    .where(and(eq(notificationPolicies.orgId, orgId), eq(notificationPolicies.active, true)))

  for (const policy of policies) {
    const tz = policy.timezone ?? 'America/Sao_Paulo'
    if (isWithinQuietHours(now, policy.quietHoursStart, policy.quietHoursEnd, tz)) {
      continue
    }

    const dayBit = 1 << dayjs(now).tz(tz).day()
    if (policy.weekdaysMask != null && (policy.weekdaysMask & dayBit) === 0) {
      continue
    }

    if (policy.scope !== 'transaction') continue

    let timeCondition

    if (policy.event === 'due_soon') {
      const from = dayjs(now).add(policy.daysBefore ?? 0, 'day').toDate()
      const to = dayjs(from).add(WINDOW_MINUTES, 'minute').toDate()
      timeCondition = and(gte(transactions.dueDate, from), lt(transactions.dueDate, to))
    } else {
      const limit = dayjs(now).subtract(policy.daysOverdue ?? 0, 'day').toDate()
      timeCondition = and(
        lte(transactions.dueDate, limit),
        sql`${transactions.paidAt} IS NULL`,
      )
    }

    const conditions = [
      eq(transactions.organizationId, orgId),
      timeCondition,
      policy.typeFilter ? eq(transactions.type, policy.typeFilter) : undefined,
      policy.categoryId ? eq(transactions.categoryId, policy.categoryId) : undefined,
    ].filter(Boolean) as any[]

    const candidates = await db
      .select({
        id: transactions.id,
        title: transactions.title,
        ownerEmail: users.email,
      })
      .from(transactions)
      .innerJoin(users, eq(users.id, transactions.ownerId))
      .where(and(...conditions))

    for (const tx of candidates) {
      const state = await db.query.notificationState.findFirst({
        where: and(
          eq(notificationState.policyId, policy.id),
          eq(notificationState.resourceType, 'transaction'),
          eq(notificationState.resourceId, tx.id),
        ),
      })

      if (policy.maxOccurrences != null && state && state.occurrences >= policy.maxOccurrences) {
        continue
      }

      if (state?.nextEligibleAt && dayjs(now).isBefore(state.nextEligibleAt)) {
        continue
      }

      await mailer.send({
        to: tx.ownerEmail,
        subject: `Transaction ${policy.event}`,
        text: `Transaction ${tx.title} triggered ${policy.event}`,
      })

      const nextEligible = calculateNextEligibleAt(now, policy.repeatEveryMinutes)

      if (state) {
        await db
          .update(notificationState)
          .set({
            lastNotifiedAt: now,
            occurrences: state.occurrences + 1,
            nextEligibleAt: nextEligible,
          })
          .where(eq(notificationState.id, state.id))
      } else {
        await db.insert(notificationState).values({
          policyId: policy.id,
          resourceType: 'transaction',
          resourceId: tx.id,
          lastNotifiedAt: now,
          occurrences: 1,
          nextEligibleAt: nextEligible,
        })
      }

      await db.insert(notificationRuns).values({
        policyId: policy.id,
        resourceType: 'transaction',
        resourceId: tx.id,
        channel: 'email',
        sentAt: now,
        status: 'sent',
      })
    }
  }
}

export function startCron() {
  if (!env.CRON_ENABLED) return

  cron.schedule('*/5 * * * *', async () => {
    const orgs = await db
      .selectDistinct({ orgId: notificationPolicies.orgId })
      .from(notificationPolicies)
      .where(eq(notificationPolicies.active, true))

    for (const { orgId } of orgs) {
      await runSchedulerTick(orgId)
    }
  })
}
