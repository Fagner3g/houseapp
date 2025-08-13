import type { FastifyReply, FastifyRequest } from 'fastify'

import { inviteService } from '@/domain/invite'
import { userService } from '@/domain/user'
import { BadRequestError } from '@/http/utils/error'

export async function getInviteController(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub

  const user = await userService.getUser({ userId })

  if (!user) {
    throw new BadRequestError('User not found')
  }

  const { invites } = await inviteService.getInvites({ email: user.email })

  return reply.status(200).send({ invites })
}
