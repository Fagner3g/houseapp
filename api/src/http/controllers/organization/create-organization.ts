import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'

import type { createOrganizationSchema } from '@/http/schemas/create-organization.schema'
import { createOrganization } from '@/use-cases/organization/create-organization'

export async function createOrganizationController(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.body as z.infer<typeof createOrganizationSchema.body>
  const userId = request.user.sub

  const { organization } = await createOrganization({ name, userId })

  return reply.status(201).send({ organizationSlug: organization.slug })
}
