import type { FastifyReply, FastifyRequest } from 'fastify'

import { markAlertReadService } from '@/domain/alerts/delivery/mark-read'

export async function markAlertReadController(
  request: FastifyRequest<{ Params: { slug: string; id: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const { id } = request.params

  const result = await markAlertReadService({ id, orgId, userId })

  return reply.status(200).send(result)
}
