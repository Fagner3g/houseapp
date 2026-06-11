import type { FastifyReply, FastifyRequest } from 'fastify'

import { removeUserFromOrg } from '@/domain/user/remove-user-from-org'
import type { RemoveUserBody } from '@/http/schemas/user/remove-user.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

type Req = FastifyRequest<{ Body: RemoveUserBody }>

export async function removeUserController(request: Req, reply: FastifyReply) {
  const { userId, mode } = request.body
  const org = request.organization

  if (!org?.id) {
    logger.error('Organization not found in request')
    throw new BadRequestError('Organization not found in request')
  }

  logger.info(`Removing user ${userId} from org ${org.id} with mode ${mode}`)

  const result = await removeUserFromOrg({
    orgId: org.id,
    targetUserId: userId,
    requesterUserId: request.user.sub,
    mode,
  })

  return reply.status(200).send(result)
}
