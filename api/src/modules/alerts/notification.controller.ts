import type { FastifyReply, FastifyRequest } from 'fastify'

import { container } from '@/core/container'

type NotificationParams = { id: string }

export async function listNotificationsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const notifications = await container.notificationService.list(request.user.sub)
  return reply.send({ notifications })
}

export async function listPendingNotificationsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const notifications = await container.notificationService.listPending(request.user.sub)
  return reply.send({ notifications })
}

export async function markNotificationReadController(
  request: FastifyRequest<{ Params: NotificationParams }>,
  reply: FastifyReply
) {
  const notification = await container.notificationService.markRead(
    request.user.sub,
    request.params.id
  )

  return reply.send({ notification })
}

export async function markInformationalNotificationsReadController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = await container.notificationService.markInformationalRead(request.user.sub)
  return reply.send(result)
}
