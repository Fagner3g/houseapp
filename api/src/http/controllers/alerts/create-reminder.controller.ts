import type { FastifyReply, FastifyRequest } from 'fastify'

import { createReminderService } from '@/domain/alerts/reminders/create-reminder'
import type { ReminderChannel, ReminderRecurrenceType } from '@/db/schemas/customReminders'

export async function createReminderController(
  request: FastifyRequest<{
    Params: { slug: string }
    Body: {
      title: string
      notes?: string | null
      dueDate: string
      amountCents?: number | null
      daysBefore: number[]
      channels: ReminderChannel[]
      recipientUserId: string
      linkedSeriesId?: string | null
      isRecurring?: boolean
      recurrenceType?: ReminderRecurrenceType | null
      recurrenceInterval?: number
      recurrenceUntil?: string | null
      notifyHour?: number | null
      notifyMinute?: number | null
      generatesTransaction?: boolean
      defaultPayToId?: string | null
      transactionType?: 'expense' | 'income'
    }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const body = request.body

  const result = await createReminderService({
    orgId,
    createdBy: userId,
    title: body.title,
    notes: body.notes,
    dueDate: new Date(body.dueDate),
    amountCents: body.amountCents,
    daysBefore: body.daysBefore,
    channels: body.channels,
    recipientUserId: body.recipientUserId,
    linkedSeriesId: body.linkedSeriesId,
    isRecurring: body.isRecurring,
    recurrenceType: body.recurrenceType,
    recurrenceInterval: body.recurrenceInterval,
    recurrenceUntil: body.recurrenceUntil ? new Date(body.recurrenceUntil) : null,
    notifyHour: body.notifyHour,
    notifyMinute: body.notifyMinute,
    generatesTransaction: body.generatesTransaction,
    defaultPayToId: body.defaultPayToId,
    transactionType: body.transactionType,
  })

  return reply.status(201).send(result)
}
