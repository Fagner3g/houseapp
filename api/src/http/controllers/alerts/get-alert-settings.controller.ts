import type { FastifyReply, FastifyRequest } from 'fastify'

import { getAlertSettingsService } from '@/domain/alerts/settings/get-alert-settings'

export async function getAlertSettingsController(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const orgId = request.organization.id
  const result = await getAlertSettingsService(orgId)
  return reply.status(200).send(result.settings)
}
