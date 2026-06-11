import type { FastifyReply, FastifyRequest } from 'fastify'

import { completeReminderPeriodService } from '@/domain/alerts/reminders/complete-reminder-period'

export async function completeReminderPeriodController(
  request: FastifyRequest<{ Params: { slug: string; id: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params

  const result = await completeReminderPeriodService({ id, orgId })

  return reply.status(200).send(result)
}
