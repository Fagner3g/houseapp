import type { FastifyReply, FastifyRequest } from 'fastify'

import { listInboxService } from '@/domain/alerts/delivery/list-inbox'

export async function listInboxController(
  request: FastifyRequest<{
    Params: { slug: string }
    Querystring: { unread?: boolean }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const userId = request.user.sub
  const unreadOnly = request.query?.unread === true

  const result = await listInboxService({ orgId, userId, unreadOnly })

  return reply.status(200).send(result)
}
