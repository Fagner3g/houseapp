import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateAlertSettingsService } from '@/domain/alerts/settings/update-alert-settings'

export async function updateAlertSettingsController(
  request: FastifyRequest<{
    Params: { slug: string }
    Body: { defaultNotifyHour: number; defaultNotifyMinute: number }
  }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const result = await updateAlertSettingsService({
    orgId,
    defaultNotifyHour: request.body.defaultNotifyHour,
    defaultNotifyMinute: request.body.defaultNotifyMinute,
  })
  return reply.status(200).send(result.settings)
}
