import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { organizationService } from '@/domain/organization'
import type { RenameOrgBody } from '@/http/schemas/organization/rename-org.schema'

type Req = FastifyRequest<{ Body: RenameOrgBody }>

export async function renameOrgController(request: Req, reply: FastifyReply) {
  const { name } = request.body
  const orgId = request.organization.id

  const { organization } = await organizationService.renameOrg({ name, orgId })
  return reply.status(StatusCodes.OK).send({ organization })
}
