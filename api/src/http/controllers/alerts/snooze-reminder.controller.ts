import type { FastifyReply, FastifyRequest } from 'fastify'

import { snoozeReminderService } from '@/domain/alerts/reminders/snooze-reminder'
import type {
  SnoozeReminderSchemaBody,
  SnoozeReminderSchemaParams,
} from '@/http/schemas/alerts/reminder.schema'

export async function snoozeReminderController(
  request: FastifyRequest<{
    Params: SnoozeReminderSchemaParams
    Body: SnoozeReminderSchemaBody
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params
  const { days, until } = request.body

  const result = await snoozeReminderService({
    id,
    orgId,
    days,
    until: until ? new Date(until) : undefined,
  })

  return reply.status(200).send(result)
}
