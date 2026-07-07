import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { db } from '@/db'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { createOrganization } from '@/domain/organization/create-organization'
import type { CreateOrganizationBody } from '@/http/schemas/organization/create-organization.schema'

type Req = FastifyRequest<{
  Body: CreateOrganizationBody
}>

export async function createOrganizationController(request: Req, reply: FastifyReply) {
  const { name } = request.body
  const userId = request.user.sub

  const { organization } = await createOrganization({ name, isFirstOrg: false, ownerId: userId })

  await db.insert(organizationMembers).values({
    userId,
    organizationId: organization.id,
    role: 'owner',
  })

  return reply
    .status(StatusCodes.CREATED)
    .send({ slug: organization.slug, name: organization.name })
}
