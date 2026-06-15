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

interface CreateReminderRequest {
  orgId: string
  createdBy: string
  title: string
  notes?: string | null
  dueDate: Date
  amountCents?: number | null
  daysBefore: number[]
  useOrgAlertDefaults?: boolean
  overdueAlertFrequency?: 'daily' | 'weekly' | 'monthly' | null
  overdueAlertInterval?: number
  channels: ReminderChannel[]
  recipientUserId: string
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

  if (input.generatesTransaction && !input.defaultPayToId) {
    throw new BadRequestError('defaultPayToId is required when generatesTransaction is true')
  }

  if (input.defaultPayToId) {
    const [payToMembership] = await db
      .select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.organizationId, input.orgId),
          eq(userOrganizations.userId, input.defaultPayToId)
        )
      )
      .limit(1)

    if (!payToMembership) {
      throw new BadRequestError('Pay-to user must belong to the organization')
    }
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
      useOrgAlertDefaults: input.useOrgAlertDefaults ?? true,
      overdueAlertFrequency: input.overdueAlertFrequency ?? null,
      overdueAlertInterval: input.overdueAlertInterval ?? 1,
      channels: input.channels,
      recipientUserId: input.recipientUserId,
      linkedSeriesId: input.linkedSeriesId ?? null,
      isRecurring: input.isRecurring ?? false,
      recurrenceType: input.isRecurring ? (input.recurrenceType ?? null) : null,
      recurrenceInterval: input.recurrenceInterval ?? 1,
      recurrenceUntil: input.recurrenceUntil ?? null,
      notifyHour: input.notifyHour ?? null,
      notifyMinute: input.notifyMinute ?? null,
      generatesTransaction: input.generatesTransaction ?? false,
      defaultPayToId: input.generatesTransaction ? (input.defaultPayToId ?? null) : null,
      transactionType: input.transactionType ?? 'expense',
    })
    .returning()

  return {
    reminder: serializeReminder({
      ...reminder,
      recipientName: recipient?.name ?? null,
    }),
  }
}
