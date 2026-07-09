import type { FastifyReply, FastifyRequest } from 'fastify'

import { container } from '@/core/container'

import type { UpdateAlertSettingsSchemaBody } from '@/http/schemas/alerts/settings.schema'

type OrgParams = { slug: string }

export async function getAlertSettingsController(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
) {
  const settings = await container.alertSettingsService.get(request.organization.id)
  return reply.send(settings)
}

export async function updateAlertSettingsController(
  request: FastifyRequest<{ Params: OrgParams; Body: UpdateAlertSettingsSchemaBody }>,
  reply: FastifyReply
) {
  const settings = await container.alertSettingsService.update(
    request.organization.id,
    request.body
  )

  return reply.send(settings)
}
