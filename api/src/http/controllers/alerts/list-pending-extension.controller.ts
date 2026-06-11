import type { FastifyReply, FastifyRequest } from 'fastify'

import { listPendingExtensionAlertsService } from '@/domain/alerts/delivery/list-pending-extension'

export async function listPendingExtensionAlertsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user.sub

  const result = await listPendingExtensionAlertsService({ userId })

  return reply.status(200).send(result)
}
