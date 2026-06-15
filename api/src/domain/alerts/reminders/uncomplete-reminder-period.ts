import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'
import { cancelReminderLinkedTransactions } from './cancel-reminder-linked-transactions'
import {
  applyDateKeyToDueDate,
  formatDueDateKey,
  getReminderPeriodKey,
  isReminderOccurrenceCompleted,
  isValidReminderOccurrenceDate,
  parseOccurrenceDateKey,
  serializeReminder,
} from '../utils'

interface UncompleteReminderPeriodRequest {
  id: string
  orgId: string
  occurrenceDate: string
}

export async function uncompleteReminderPeriodService({
  id,
  orgId,
  occurrenceDate,
}: UncompleteReminderPeriodRequest) {
  const [existing] = await db
    .select()
    .from(customReminders)
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new BadRequestError('Reminder not found')
  }

  const parsedOccurrence = parseOccurrenceDateKey(occurrenceDate)

  if (!isValidReminderOccurrenceDate(existing, parsedOccurrence)) {
    throw new BadRequestError('Invalid reminder occurrence date')
  }

  if (!isReminderOccurrenceCompleted(existing, parsedOccurrence)) {
    throw new BadRequestError('Reminder occurrence is not completed')
  }

  const now = new Date()
  const occurrenceKey = formatDueDateKey(parsedOccurrence)
  const rolledDueDate = applyDateKeyToDueDate(existing.dueDate, occurrenceKey)
  const periodKey = getReminderPeriodKey(
    rolledDueDate,
    existing.isRecurring ? existing.recurrenceType : null
  )

  return db.transaction(async trx => {
    await cancelReminderLinkedTransactions(id, { periodKey, blockIfPaid: true, trx })

    const [reminder] = await trx
      .update(customReminders)
      .set({
        dueDate: rolledDueDate,
        active: true,
        completedAt: null,
        lastCompletedPeriodKey: null,
        snoozedUntil: null,
        updatedAt: now,
      })
      .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
      .returning()

    const [recipient] = await trx
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
  })
}
