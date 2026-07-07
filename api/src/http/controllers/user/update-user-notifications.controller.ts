import type { FastifyReply, FastifyRequest } from 'fastify'

import type { UpdateUserNotificationsInputParams } from '../../schemas/user/update-user-notifications.schema'

export async function updateUserNotificationsController(
  _request: FastifyRequest<{
    Params: { slug: string }
    Body: UpdateUserNotificationsInputParams
  }>,
  reply: FastifyReply
) {
  return reply.status(501).send({
    message:
      'Notification preferences moved to alert rules — endpoint will be rewritten in Phase 2',
  })
}
