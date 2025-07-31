import type { FastifyReply, FastifyRequest } from 'fastify'

import { createOrganization } from '@/functions/organization/create-organization'

export async function createOrganizationController(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.body as { name: string }
  const userId = request.user.sub

  const { organization } = await createOrganization({ name, userId })

  return reply.status(201).send({ organizationSlug: organization.slug })
}
