import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { reminderOccurrenceTransactions } from '@/db/schemas/reminderOccurrenceTransactions'
import { subPeriod } from '@/domain/recurrence/utils'
import type { RecurrenceType } from '@/domain/recurrence/utils'
import {
  applyDateKeyToDueDate,
  formatDueDateKey,
  getReminderPeriodKey,
} from '../utils'

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

function buildSyncedDueDate(reminderDueDate: Date, nextDueDate: Date): Date {
  const synced = applyDateKeyToDueDate(reminderDueDate, formatDueDateKey(nextDueDate))
  synced.setHours(
    reminderDueDate.getHours(),
    reminderDueDate.getMinutes(),
    reminderDueDate.getSeconds(),
    reminderDueDate.getMilliseconds()
  )
  return synced
}

async function loadReminder(reminderId: string, trx: DbExecutor) {
  const [reminder] = await trx
    .select()
    .from(customReminders)
    .where(eq(customReminders.id, reminderId))
    .limit(1)
  return reminder ?? null
}

async function revertReminderAfterTransactionRemoval(
  reminder: typeof customReminders.$inferSelect,
  periodKey: string,
  trx: DbExecutor
) {
  const now = new Date()
  const recurrenceType = reminder.isRecurring ? reminder.recurrenceType : null
  const currentPeriodKey = getReminderPeriodKey(reminder.dueDate, recurrenceType)
  const updates: Partial<typeof customReminders.$inferInsert> = {
    active: true,
    completedAt: null,
    lastCompletedPeriodKey: null,
    snoozedUntil: null,
    updatedAt: now,
  }

  if (reminder.isRecurring && reminder.recurrenceType && currentPeriodKey > periodKey) {
    updates.dueDate = subPeriod(
      reminder.dueDate,
      reminder.recurrenceType as RecurrenceType,
      reminder.recurrenceInterval
    )
  }

  await trx
    .update(customReminders)
    .set(updates)
    .where(eq(customReminders.id, reminder.id))
}

export async function revertRemindersLinkedToDeletedSeries(
  seriesIds: string[],
  trx: DbExecutor = db
) {
  if (seriesIds.length === 0) return

  const links = await trx
    .select()
    .from(reminderOccurrenceTransactions)
    .where(inArray(reminderOccurrenceTransactions.seriesId, seriesIds))

  const revertedReminderIds = new Set<string>()

  for (const link of links) {
    if (revertedReminderIds.has(link.reminderId)) continue

    const reminder = await loadReminder(link.reminderId, trx)
    if (!reminder) continue

    await revertReminderAfterTransactionRemoval(reminder, link.periodKey, trx)
    revertedReminderIds.add(link.reminderId)
  }

  if (links.length > 0) {
    await trx
      .delete(reminderOccurrenceTransactions)
      .where(inArray(reminderOccurrenceTransactions.seriesId, seriesIds))
  }

  await trx
    .update(customReminders)
    .set({ linkedSeriesId: null, updatedAt: new Date() })
    .where(inArray(customReminders.linkedSeriesId, seriesIds))
}

export async function syncRemindersForOccurrenceDueDateChange(
  occurrenceId: string,
  seriesId: string,
  newDueDate: Date,
  trx: DbExecutor = db
) {
  const links = await trx
    .select()
    .from(reminderOccurrenceTransactions)
    .where(eq(reminderOccurrenceTransactions.occurrenceId, occurrenceId))

  const now = new Date()
  const updatedReminderIds = new Set<string>()

  for (const link of links) {
    const reminder = await loadReminder(link.reminderId, trx)
    if (!reminder) continue

    const recurrenceType = reminder.isRecurring ? reminder.recurrenceType : null
    const currentPeriodKey = getReminderPeriodKey(reminder.dueDate, recurrenceType)
    const stillOnLinkedPeriod = currentPeriodKey === link.periodKey
    const wasCompletedForPeriod =
      reminder.completedAt != null || reminder.lastCompletedPeriodKey === link.periodKey

    if (!stillOnLinkedPeriod && !wasCompletedForPeriod) continue

    await trx
      .update(customReminders)
      .set({
        dueDate: buildSyncedDueDate(reminder.dueDate, newDueDate),
        active: true,
        completedAt: null,
        lastCompletedPeriodKey: null,
        snoozedUntil: null,
        updatedAt: now,
      })
      .where(eq(customReminders.id, reminder.id))

    updatedReminderIds.add(reminder.id)
  }

  const linkedSeriesReminders = await trx
    .select()
    .from(customReminders)
    .where(eq(customReminders.linkedSeriesId, seriesId))

  for (const reminder of linkedSeriesReminders) {
    if (updatedReminderIds.has(reminder.id)) continue

    await trx
      .update(customReminders)
      .set({
        dueDate: buildSyncedDueDate(reminder.dueDate, newDueDate),
        active: true,
        completedAt: null,
        lastCompletedPeriodKey: null,
        snoozedUntil: null,
        updatedAt: now,
      })
      .where(eq(customReminders.id, reminder.id))
  }
}
