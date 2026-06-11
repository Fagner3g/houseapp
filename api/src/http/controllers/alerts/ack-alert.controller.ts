import type { FastifyReply, FastifyRequest } from 'fastify'

import { ackAlertDeliveryService } from '@/domain/alerts/delivery/ack-delivery'

export async function ackAlertController(
  request: FastifyRequest<{ Params: { slug: string; id: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const { id } = request.params

  const result = await ackAlertDeliveryService({ id, orgId, userId })

  return reply.status(200).send(result)
}
