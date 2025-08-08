import type { FastifyReply, FastifyRequest } from 'fastify'

import { inviteService } from '@/domain/invite'
import { createForUserInvite } from '@/domain/user/create-invite-for-user'
import { getUser } from '@/domain/user/get-user'
import type { CreateUserWithInviteBody } from '@/http/schemas/user/create-user-with-invite.schema'

type Req = FastifyRequest<{ Body: CreateUserWithInviteBody }>

export async function createUserWithInviteController(request: Req, reply: FastifyReply) {
  const { email, name, phone } = request.body
  const orgId = request.organization.id

  const user = await getUser({ email })

  if (user) {
    await inviteService.create({ email, orgId, userId: user.id })
  } else {
    await createForUserInvite({ name, email, phone, orgIdInvite: orgId })
  }
  // TODO: send email

  reply.status(201).send(null)
}
