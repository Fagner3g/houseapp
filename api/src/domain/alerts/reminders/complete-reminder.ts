import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { users } from '@/db/schemas/users'
import { addPeriod } from '@/domain/recurrence/utils'
import type { RecurrenceType } from '@/domain/recurrence/utils'
import { BadRequestError } from '@/http/utils/error'
import { serializeReminder } from '../utils'

interface CompleteReminderRequest {
  id: string
  orgId: string
}

export async function completeReminderService({ id, orgId }: CompleteReminderRequest) {
  const [existing] = await db
    .select()
    .from(customReminders)
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new BadRequestError('Reminder not found')
  }

  const now = new Date()
  let reminder = existing

  if (existing.isRecurring && existing.recurrenceType) {
    const nextDueDate = addPeriod(
      existing.dueDate,
      existing.recurrenceType as RecurrenceType,
      existing.recurrenceInterval
    )

    if (existing.recurrenceUntil && nextDueDate > existing.recurrenceUntil) {
      const [updated] = await db
        .update(customReminders)
        .set({
          completedAt: now,
          active: false,
          updatedAt: now,
        })
        .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
        .returning()
      reminder = updated
    } else {
      const [updated] = await db
        .update(customReminders)
        .set({
          dueDate: nextDueDate,
          completedAt: null,
          active: true,
          updatedAt: now,
        })
        .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
        .returning()
      reminder = updated
    }
  } else {
    const [updated] = await db
      .update(customReminders)
      .set({
        completedAt: now,
        active: false,
        updatedAt: now,
      })
      .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
      .returning()
    reminder = updated
  }

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
