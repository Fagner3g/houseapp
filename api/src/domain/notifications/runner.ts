import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { and, eq, gte, isNull, lt, lte } from 'drizzle-orm'
import cron from 'node-cron'

import { env } from '@/config/env'
import { db } from '@/db'
import { notificationPolicies } from '@/db/schemas/notificationPolicies'
import { notificationRuns } from '@/db/schemas/notificationRuns'
import { notificationState } from '@/db/schemas/notificationState'
import type { TransactionCategory } from '@/db/schemas/transactions'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'
import { sendMail } from '@/domain/mail/sending'
import { calculateNextEligibleAt, isWithinQuietHours } from './utils'

dayjs.extend(utc)
dayjs.extend(timezone)

const WINDOW_MINUTES = 1

export async function runSchedulerTickAll() {
  const now = new Date()

  const policies = await db
    .select()
    .from(notificationPolicies)
    .where(eq(notificationPolicies.active, true))

  for (const policy of policies) {
    const tz = policy.timezone ?? 'America/Sao_Paulo'
    const nowTz = dayjs(now).tz(tz)
    if (isWithinQuietHours(now, policy.quietHoursStart, policy.quietHoursEnd, tz)) {
      continue
    }

    const dayBit = 1 << nowTz.day()
    if (policy.weekdaysMask != null && (policy.weekdaysMask & dayBit) === 0) {
      continue
    }

    if (policy.scope !== 'transaction') continue

    // Respeita canais configurados; só envia email se a policy incluir 'email'
    if (!policy.channels?.includes('email')) continue

    let timeCondition: any

    if (policy.event === 'due_soon') {
      const fromTz = nowTz.add(policy.daysBefore ?? 0, 'day').startOf('minute')
      const toTz = fromTz.add(WINDOW_MINUTES, 'minute')
      const from = fromTz.utc().toDate()
      const to = toTz.utc().toDate()
      timeCondition = and(
        gte(transactions.dueDate, from),
        lt(transactions.dueDate, to),
        isNull(transactions.paidAt)
      )
    } else {
      const limit = nowTz
        .subtract(policy.daysOverdue ?? 0, 'day')
        .endOf('minute')
        .utc()
        .toDate()
      timeCondition = and(lte(transactions.dueDate, limit), isNull(transactions.paidAt))
    }

    const conditions = [
      eq(transactions.organizationId, policy.orgId),
      timeCondition,
      policy.typeFilter
        ? eq(transactions.type, policy.typeFilter as unknown as TransactionCategory)
        : undefined,
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
      const state = await db
        .select()
        .from(notificationState)
        .where(
          and(
            eq(notificationState.policyId, policy.id),
            eq(notificationState.resourceType, 'transaction'),
            eq(notificationState.resourceId, tx.id)
          )
        )
        .limit(1)
        .then(rows => rows[0])

      if (
        policy.maxOccurrences != null &&
        state &&
        state.occurrences &&
        state.occurrences >= policy.maxOccurrences
      ) {
        continue
      }

      if (state?.nextEligibleAt && dayjs(now).isBefore(state.nextEligibleAt)) {
        continue
      }

      if ((policy.repeatEveryMinutes == null || policy.repeatEveryMinutes === 0) && state) {
        // Política sem repetição e já houve envio
        continue
      }

      try {
        await sendMail({
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
              occurrences: state?.occurrences + 1,
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
      } catch (err: any) {
        await db.insert(notificationRuns).values({
          policyId: policy.id,
          resourceType: 'transaction',
          resourceId: tx.id,
          channel: 'email',
          sentAt: now,
          status: 'error',
          error: err?.message ?? 'send-failed',
        })
      }
    }
  }
}

export function startCron() {
  if (!env.CRON_ENABLED) return

  cron.schedule('5 * * * *', async () => {
    try {
      await runSchedulerTickAll()
    } catch (err) {
      console.error('[scheduler] tick failed', err)
    }
  })
}
