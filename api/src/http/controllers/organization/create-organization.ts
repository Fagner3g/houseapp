import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'

import { createOrganization } from '@/domain/organization/create-organization'
import type { createOrganizationSchema } from '@/http/schemas/create-organization.schema'

export async function createOrganizationController(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.body as z.infer<typeof createOrganizationSchema.body>
  const userId = request.user.sub

  const { organization } = await createOrganization({ name, userId })

  return reply.status(201).send({ organizationSlug: organization.slug })
}
