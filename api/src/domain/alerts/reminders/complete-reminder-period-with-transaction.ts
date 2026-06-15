import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { reminderOccurrenceTransactions } from '@/db/schemas/reminderOccurrenceTransactions'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { users } from '@/db/schemas/users'
import { createTransactionService } from '@/domain/transactions/create-transaction'
import { getUser } from '@/domain/user/get-user'
import { BadRequestError } from '@/http/utils/error'
import { toCentsStrict } from '@/http/utils/format'
import { applyCompleteReminderPeriodUpdate } from './complete-reminder-period'
import {
  getReminderPeriodKey,
  resolveReminderTransactionDueDate,
  serializeReminder,
} from '../utils'

interface CompleteReminderPeriodWithTransactionRequest {
  id: string
  orgId: string
  amount: string
  date?: string
  payToEmail?: string
  description?: string
}

export async function completeReminderPeriodWithTransactionService({
  id,
  orgId,
  amount,
  date,
  payToEmail,
  description,
}: CompleteReminderPeriodWithTransactionRequest) {
  return db.transaction(async trx => {
    const [existing] = await trx
      .select()
      .from(customReminders)
      .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
      .limit(1)

    if (!existing) {
      throw new BadRequestError('Reminder not found')
    }

    if (!existing.generatesTransaction) {
      throw new BadRequestError('Reminder is not configured to generate transactions')
    }

    const periodKey = getReminderPeriodKey(
      existing.dueDate,
      existing.isRecurring ? existing.recurrenceType : null
    )

    if (existing.lastCompletedPeriodKey === periodKey) {
      throw new BadRequestError('Reminder period is already completed')
    }

    const [existingLink] = await trx
      .select()
      .from(reminderOccurrenceTransactions)
      .where(
        and(
          eq(reminderOccurrenceTransactions.reminderId, id),
          eq(reminderOccurrenceTransactions.periodKey, periodKey)
        )
      )
      .limit(1)

    if (existingLink) {
      throw new BadRequestError('Transaction already registered for this period')
    }

    let payToId = existing.defaultPayToId
    if (payToEmail) {
      const user = await getUser({ email: payToEmail })
      if (!user) {
        throw new BadRequestError('User not found')
      }
      payToId = user.id
    }

    if (!payToId) {
      throw new BadRequestError('Pay-to user is required for transaction generation')
    }

    const amountCents = toCentsStrict(amount)
    const transactionDueDate = resolveReminderTransactionDueDate(date, existing.dueDate)

    const { series } = await createTransactionService(
      {
        type: existing.transactionType,
        title: existing.title,
        ownerId: existing.recipientUserId,
        payToId,
        organizationId: orgId,
        amount: amountCents,
        dueDate: transactionDueDate,
        description: description ?? existing.notes ?? undefined,
        isRecurring: false,
        tags: [],
      } as Parameters<typeof createTransactionService>[0],
      trx
    )

    const [occurrence] = await trx
      .select()
      .from(transactionOccurrences)
      .where(eq(transactionOccurrences.seriesId, series.id))
      .orderBy(transactionOccurrences.dueDate)
      .limit(1)

    if (!occurrence) {
      throw new BadRequestError('Failed to create transaction occurrence')
    }

    await trx.insert(reminderOccurrenceTransactions).values({
      reminderId: id,
      periodKey,
      occurrenceId: occurrence.id,
      seriesId: series.id,
    })

    const reminder = await applyCompleteReminderPeriodUpdate(existing, trx)

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
      seriesId: series.id,
      occurrenceId: occurrence.id,
    }
  })
}
