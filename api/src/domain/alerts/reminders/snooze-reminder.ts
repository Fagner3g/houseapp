import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'
import { serializeReminder } from '../utils'

interface SnoozeReminderRequest {
  id: string
  orgId: string
  days?: number
  until?: Date
}

export async function snoozeReminderService({ id, orgId, days, until }: SnoozeReminderRequest) {
  if (days == null && until == null) {
    throw new BadRequestError('Either days or until is required')
  }

  let snoozedUntil: Date
  if (until) {
    snoozedUntil = until
  } else {
    snoozedUntil = new Date()
    snoozedUntil.setDate(snoozedUntil.getDate() + (days ?? 0))
  }

  const [reminder] = await db
    .update(customReminders)
    .set({
      snoozedUntil,
      updatedAt: new Date(),
    })
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .returning()

  if (!reminder) {
    throw new BadRequestError('Reminder not found')
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
