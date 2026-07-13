import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateUserNotifications } from '@/domain/user/update-user-notifications'
import type { UpdateUserNotificationsInputParams } from '../../schemas/user/update-user-notifications.schema'

export async function updateUserNotificationsController(
  request: FastifyRequest<{
    Params: { slug: string }
    Body: UpdateUserNotificationsInputParams
  }>,
  reply: FastifyReply
) {
  const { userId, notificationsEnabled, alertPreferences } = request.body
  const org = request.organization

  if (!org?.id) {
    return reply.status(404).send({ message: 'Organization not found' })
  }

  const updated = await updateUserNotifications({
    orgId: org.id,
    userId,
    notificationsEnabled,
    alertPreferences,
  })

  if (!updated) {
    return reply.status(404).send({ message: 'User not found in organization' })
  }

  return reply.status(200).send(updated)
}
