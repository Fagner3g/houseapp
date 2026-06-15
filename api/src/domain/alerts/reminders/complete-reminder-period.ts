import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { users } from '@/db/schemas/users'
import { addPeriod } from '@/domain/recurrence/utils'
import type { RecurrenceType } from '@/domain/recurrence/utils'
import { BadRequestError } from '@/http/utils/error'
import { getReminderPeriodKey, serializeReminder } from '../utils'

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

interface CompleteReminderPeriodRequest {
  id: string
  orgId: string
}

export async function applyCompleteReminderPeriodUpdate(
  existing: typeof customReminders.$inferSelect,
  trx: DbExecutor = db
) {
  const now = new Date()
  const periodKey = getReminderPeriodKey(
    existing.dueDate,
    existing.isRecurring ? existing.recurrenceType : null
  )

  if (existing.isRecurring && existing.recurrenceType) {
    const nextDueDate = addPeriod(
      existing.dueDate,
      existing.recurrenceType as RecurrenceType,
      existing.recurrenceInterval
    )

    if (existing.recurrenceUntil && nextDueDate > existing.recurrenceUntil) {
      const [updated] = await trx
        .update(customReminders)
        .set({
          lastCompletedPeriodKey: periodKey,
          completedAt: now,
          active: false,
          snoozedUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(customReminders.id, existing.id),
            eq(customReminders.organizationId, existing.organizationId)
          )
        )
        .returning()
      return updated
    }

    const [updated] = await trx
      .update(customReminders)
      .set({
        dueDate: nextDueDate,
        lastCompletedPeriodKey: null,
        completedAt: null,
        active: true,
        snoozedUntil: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(customReminders.id, existing.id),
          eq(customReminders.organizationId, existing.organizationId)
        )
      )
      .returning()
    return updated
  }

  const [updated] = await trx
    .update(customReminders)
    .set({
      lastCompletedPeriodKey: periodKey,
      completedAt: now,
      active: false,
      snoozedUntil: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(customReminders.id, existing.id),
        eq(customReminders.organizationId, existing.organizationId)
      )
    )
    .returning()
  return updated
}

export async function completeReminderPeriodService({ id, orgId }: CompleteReminderPeriodRequest) {
  const [existing] = await db
    .select()
    .from(customReminders)
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new BadRequestError('Reminder not found')
  }

  const reminder = await applyCompleteReminderPeriodUpdate(existing)

  const [recipient] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, reminder.recipientUserId))
    .limit(1)

  return {
    reminder: serializeReminder({
      ...reminder,
      recipientName: recipient?.name ?? null,
    }),
  }
}
