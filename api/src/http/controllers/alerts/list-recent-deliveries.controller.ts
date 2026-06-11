import type { FastifyReply, FastifyRequest } from 'fastify'

import { listRecentDeliveriesService } from '@/domain/alerts/delivery/list-recent-deliveries'

export async function listRecentDeliveriesController(
  request: FastifyRequest<{
    Params: { slug: string }
    Querystring: { hours?: number; limit?: number }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const hours = request.query?.hours
  const limit = request.query?.limit

  const result = await listRecentDeliveriesService({ orgId, hours, limit })

  return reply.status(200).send(result)
}
