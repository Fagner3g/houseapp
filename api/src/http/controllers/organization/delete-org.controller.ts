import type { FastifyReply, FastifyRequest } from 'fastify'

import { organizationService } from '@/domain/organization'

export async function deleteOrgController(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.organization.id
  const userId = request.user.sub

  await organizationService.deleteOrg({ orgId, userId })

  return reply.status(200).send()
}
