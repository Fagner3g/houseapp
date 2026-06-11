import type { FastifyReply, FastifyRequest } from 'fastify'

import { completeReminderService } from '@/domain/alerts/reminders/complete-reminder'

export async function completeReminderController(
  request: FastifyRequest<{ Params: { slug: string; id: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { id } = request.params

  const result = await completeReminderService({ id, orgId })

  return reply.status(200).send(result)
}
