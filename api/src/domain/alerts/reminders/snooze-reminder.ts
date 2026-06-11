import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'
import { getEndOfDueMonth, isDateInDueMonth, serializeReminder } from '../utils'

interface SnoozeReminderRequest {
  id: string
  orgId: string
  days?: number
  until?: Date
}

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function validateSnoozeDate(snoozedUntil: Date, dueDate: Date) {
  const today = startOfToday()
  const untilDay = new Date(snoozedUntil)
  untilDay.setHours(0, 0, 0, 0)

  if (untilDay < today) {
    throw new BadRequestError('Snooze date must be today or later')
  }

  if (!isDateInDueMonth(snoozedUntil, dueDate)) {
    throw new BadRequestError(
      'Snooze date must be within the due date calendar month'
    )
  }
}

export async function snoozeReminderService({ id, orgId, days, until }: SnoozeReminderRequest) {
  if (days == null && until == null) {
    throw new BadRequestError('Either days or until is required')
  }

  const [existing] = await db
    .select()
    .from(customReminders)
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new BadRequestError('Reminder not found')
  }

  let snoozedUntil: Date
  if (until) {
    snoozedUntil = until
    validateSnoozeDate(snoozedUntil, existing.dueDate)
  } else {
    snoozedUntil = new Date()
    snoozedUntil.setDate(snoozedUntil.getDate() + (days ?? 0))
    const endOfMonth = getEndOfDueMonth(existing.dueDate)
    if (snoozedUntil > endOfMonth) {
      snoozedUntil = endOfMonth
    }
    validateSnoozeDate(snoozedUntil, existing.dueDate)
  }

  const [reminder] = await db
    .update(customReminders)
    .set({
      snoozedUntil,
      updatedAt: new Date(),
    })
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .returning()

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
