import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { userService } from '@/domain/user'

export async function getProfileController(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user.sub

  const user = await userService.getUser({ userId })

  reply.status(StatusCodes.OK).send({ user })
}
