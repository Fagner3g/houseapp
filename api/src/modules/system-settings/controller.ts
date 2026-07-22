import type { FastifyReply, FastifyRequest } from 'fastify'

import type { UpdateSystemNotificationSettingsBody } from './schema'
import {
  getSystemNotificationSettings,
  setSystemNotificationsEnabled,
} from './notifications-enabled'

type OrgParams = { slug: string }

export async function getSystemNotificationSettingsController(
  _request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const settings = await getSystemNotificationSettings()
  return reply.send(settings)
}

export async function updateSystemNotificationSettingsController(
  request: FastifyRequest<{ Params: OrgParams; Body: UpdateSystemNotificationSettingsBody }>,
  reply: FastifyReply
) {
  const settings = await setSystemNotificationsEnabled(request.body.notificationsEnabled)
  return reply.send(settings)
}
