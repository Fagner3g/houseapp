import type { FastifyReply, FastifyRequest } from 'fastify'

import { uncompleteReminderPeriodService } from '@/domain/alerts/reminders/uncomplete-reminder-period'

export async function uncompleteReminderPeriodController(
  request: FastifyRequest<{
    Params: { slug: string; id: string }
    Body: { occurrenceDate: string }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params
  const { occurrenceDate } = request.body

  const result = await uncompleteReminderPeriodService({ id, orgId, occurrenceDate })

  return reply.status(200).send(result)
}
