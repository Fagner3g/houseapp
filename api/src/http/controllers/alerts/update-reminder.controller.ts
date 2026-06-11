import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateReminderService } from '@/domain/alerts/reminders/update-reminder'
import type { ReminderChannel, ReminderRecurrenceType } from '@/db/schemas/customReminders'

export async function updateReminderController(
  request: FastifyRequest<{
    Params: { slug: string; id: string }
    Body: {
      title?: string
      notes?: string | null
      dueDate?: string
      amountCents?: number | null
      daysBefore?: number[]
      channels?: ReminderChannel[]
      recipientUserId?: string
      active?: boolean
      linkedSeriesId?: string | null
      isRecurring?: boolean
      recurrenceType?: ReminderRecurrenceType | null
      recurrenceInterval?: number
      recurrenceUntil?: string | null
      notifyHour?: number | null
      notifyMinute?: number | null
    }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params
  const body = request.body

  const result = await updateReminderService({
    id,
    orgId,
    title: body.title,
    notes: body.notes,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    amountCents: body.amountCents,
    daysBefore: body.daysBefore,
    channels: body.channels,
    recipientUserId: body.recipientUserId,
    active: body.active,
    linkedSeriesId: body.linkedSeriesId,
    isRecurring: body.isRecurring,
    recurrenceType: body.recurrenceType,
    recurrenceInterval: body.recurrenceInterval,
    recurrenceUntil:
      body.recurrenceUntil !== undefined
        ? body.recurrenceUntil
          ? new Date(body.recurrenceUntil)
          : null
        : undefined,
    notifyHour: body.notifyHour,
    notifyMinute: body.notifyMinute,
  })

  return reply.status(200).send(result)
}
