import type { FastifyReply, FastifyRequest } from 'fastify'

import { updateUser } from '@/domain/user/update-user'
import type { UpdateUserInputParams } from '@/http/schemas/user/update-user.schema'
import { BadRequestError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

type Req = FastifyRequest<{ Body: UpdateUserInputParams }>

export async function updateUserController(request: Req, reply: FastifyReply) {
  const { userId, name, phone, email } = request.body

  const org = request.organization
  if (!org?.id) {
    logger.error('Organization not found in request')
    throw new BadRequestError('Organization not found in request')
  }

  logger.info(`Updating user ${userId} with new email: ${email} in org: ${org.id}`)

  const updated = await updateUser({ orgId: org.id, userId, email, name, phone })
  if (!updated) {
    logger.error(`User not found or not in organization: ${userId}`)
    throw new BadRequestError('User not found or not in organization')
  }

  logger.info(`User updated successfully: ${userId}`)
  return reply.status(200).send(updated)
}
