import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { userService } from '@/domain/user'
import { UnauthorizedError } from '@/http/utils/error'

export async function getProfileController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub

  const user = await userService.getUser({ userId })

  if (!user) {
    throw new UnauthorizedError('Session expired. Please sign in again.')
  }

  reply.status(StatusCodes.OK).send({ user })
}
