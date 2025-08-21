import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { db } from '@/db'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { createOrganization } from '@/domain/organization/create-organization'
import type { CreateOrganizationBody } from '@/http/schemas/organization/create-organization.schema'

type Req = FastifyRequest<{
  Body: CreateOrganizationBody
}>

export async function createOrganizationController(request: Req, reply: FastifyReply) {
  const { name, description } = request.body
  const userId = request.user.sub

  const { organization } = await createOrganization({
    name,
    description,
    isFirstOrg: false,
    ownerId: userId,
  })

  await db.insert(userOrganizations).values({
    userId,
    organizationId: organization.id,
  })

  return reply
    .status(StatusCodes.CREATED)
    .send({ slug: organization.slug, name: organization.name, description: organization.description })
}
