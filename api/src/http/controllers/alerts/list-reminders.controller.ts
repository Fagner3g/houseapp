import type { FastifyReply, FastifyRequest } from 'fastify'

import { listRemindersService } from '@/domain/alerts/reminders/list-reminders'

export async function listRemindersController(
  request: FastifyRequest<{
    Params: { slug: string }
    Querystring: { includeCompleted?: boolean }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const { includeCompleted } = request.query

  const result = await listRemindersService({ orgId, includeCompleted })

  return reply.status(200).send(result)
}
