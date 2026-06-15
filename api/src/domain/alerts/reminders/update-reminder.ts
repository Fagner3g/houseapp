import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type {
  ReminderChannel,
  ReminderRecurrenceType,
  ReminderTransactionType,
} from '@/db/schemas/customReminders'
import { customReminders } from '@/db/schemas/customReminders'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'
import { serializeReminder } from '../utils'

interface UpdateReminderRequest {
  id: string
  orgId: string
  title?: string
  notes?: string | null
  dueDate?: Date
  amountCents?: number | null
  daysBefore?: number[]
  useOrgAlertDefaults?: boolean
  overdueAlertFrequency?: 'daily' | 'weekly' | 'monthly' | null
  overdueAlertInterval?: number
  channels?: ReminderChannel[]
  recipientUserId?: string
  active?: boolean
  linkedSeriesId?: string | null
  isRecurring?: boolean
  recurrenceType?: ReminderRecurrenceType | null
  recurrenceInterval?: number
  recurrenceUntil?: Date | null
  notifyHour?: number | null
  notifyMinute?: number | null
  generatesTransaction?: boolean
  defaultPayToId?: string | null
  transactionType?: ReminderTransactionType
}

export async function updateReminderService(input: UpdateReminderRequest) {
  const [current] = await db
    .select()
    .from(customReminders)
    .where(and(eq(customReminders.id, input.id), eq(customReminders.organizationId, input.orgId)))
    .limit(1)

  if (!current) {
    throw new BadRequestError('Reminder not found')
  }

  const nextGeneratesTransaction = input.generatesTransaction ?? current.generatesTransaction
  const nextDefaultPayToId =
    input.defaultPayToId !== undefined ? input.defaultPayToId : current.defaultPayToId

  if (nextGeneratesTransaction && !nextDefaultPayToId) {
    throw new BadRequestError('defaultPayToId is required when generatesTransaction is true')
  }

  if (input.recipientUserId) {
    const [recipientMembership] = await db
      .select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.organizationId, input.orgId),
          eq(userOrganizations.userId, input.recipientUserId)
        )
      )
      .limit(1)

    if (!recipientMembership) {
      throw new BadRequestError('Recipient must belong to the organization')
    }
  }

  const payToIdToValidate =
    input.defaultPayToId !== undefined ? input.defaultPayToId : input.generatesTransaction ? nextDefaultPayToId : null

  if (payToIdToValidate) {
    const [payToMembership] = await db
      .select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.organizationId, input.orgId),
          eq(userOrganizations.userId, payToIdToValidate)
        )
      )
      .limit(1)

    if (!payToMembership) {
      throw new BadRequestError('Pay-to user must belong to the organization')
    }
  }

  if (input.isRecurring === true && input.recurrenceType === null) {
    throw new BadRequestError('Recurrence type is required for recurring reminders')
  }

  const updates: Partial<typeof customReminders.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate
  if (input.amountCents !== undefined) {
    updates.amountCents =
      input.amountCents != null ? BigInt(Math.round(input.amountCents)) : null
  }
  if (input.daysBefore !== undefined) updates.daysBefore = input.daysBefore
  if (input.useOrgAlertDefaults !== undefined) {
    updates.useOrgAlertDefaults = input.useOrgAlertDefaults
  }
  if (input.overdueAlertFrequency !== undefined) {
    updates.overdueAlertFrequency = input.overdueAlertFrequency
  }
  if (input.overdueAlertInterval !== undefined) {
    updates.overdueAlertInterval = input.overdueAlertInterval
  }
  if (input.channels !== undefined) updates.channels = input.channels
  if (input.recipientUserId !== undefined) updates.recipientUserId = input.recipientUserId
  if (input.active !== undefined) updates.active = input.active
  if (input.linkedSeriesId !== undefined) updates.linkedSeriesId = input.linkedSeriesId
  if (input.isRecurring !== undefined) {
    updates.isRecurring = input.isRecurring
    if (!input.isRecurring) {
      updates.recurrenceType = null
    }
  }
  if (input.recurrenceType !== undefined) updates.recurrenceType = input.recurrenceType
  if (input.recurrenceInterval !== undefined) updates.recurrenceInterval = input.recurrenceInterval
  if (input.recurrenceUntil !== undefined) updates.recurrenceUntil = input.recurrenceUntil
  if (input.notifyHour !== undefined) updates.notifyHour = input.notifyHour
  if (input.notifyMinute !== undefined) updates.notifyMinute = input.notifyMinute
  if (input.generatesTransaction !== undefined) {
    updates.generatesTransaction = input.generatesTransaction
    if (!input.generatesTransaction) {
      updates.defaultPayToId = null
    }
  }
  if (input.defaultPayToId !== undefined) updates.defaultPayToId = input.defaultPayToId
  if (input.transactionType !== undefined) updates.transactionType = input.transactionType

  const [reminder] = await db
    .update(customReminders)
    .set(updates)
    .where(and(eq(customReminders.id, input.id), eq(customReminders.organizationId, input.orgId)))
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
