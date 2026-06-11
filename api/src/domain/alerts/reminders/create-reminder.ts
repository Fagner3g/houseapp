import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { ReminderChannel, ReminderRecurrenceType } from '@/db/schemas/customReminders'
import { customReminders } from '@/db/schemas/customReminders'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'
import { serializeReminder } from '../utils'

interface CreateReminderRequest {
  orgId: string
  createdBy: string
  title: string
  notes?: string | null
  dueDate: Date
  amountCents?: number | null
  daysBefore: number[]
  channels: ReminderChannel[]
  recipientUserId: string
  linkedSeriesId?: string | null
  isRecurring?: boolean
  recurrenceType?: ReminderRecurrenceType | null
  recurrenceInterval?: number
  recurrenceUntil?: Date | null
  notifyHour?: number | null
  notifyMinute?: number | null
}

export async function createReminderService(input: CreateReminderRequest) {
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

  if (input.isRecurring && !input.recurrenceType) {
    throw new BadRequestError('Recurrence type is required for recurring reminders')
  }

  const [recipient] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, input.recipientUserId))
    .limit(1)

  const [reminder] = await db
    .insert(customReminders)
    .values({
      organizationId: input.orgId,
      createdBy: input.createdBy,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      dueDate: input.dueDate,
      amountCents:
        input.amountCents != null ? BigInt(Math.round(input.amountCents)) : null,
      daysBefore: input.daysBefore,
      channels: input.channels,
      recipientUserId: input.recipientUserId,
      linkedSeriesId: input.linkedSeriesId ?? null,
      isRecurring: input.isRecurring ?? false,
      recurrenceType: input.isRecurring ? (input.recurrenceType ?? null) : null,
      recurrenceInterval: input.recurrenceInterval ?? 1,
      recurrenceUntil: input.recurrenceUntil ?? null,
      notifyHour: input.notifyHour ?? null,
      notifyMinute: input.notifyMinute ?? null,
    })
    .returning()

  return {
    reminder: serializeReminder({
      ...reminder,
      recipientName: recipient?.name ?? null,
    }),
  }
}
