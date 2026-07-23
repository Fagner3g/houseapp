import { sql } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { inviteService } from '@/domain/invite'
import { createForUserInvite } from '@/domain/user/create-invite-for-user'
import type { CreateUserWithInviteBody } from '@/http/schemas/user/create-user-with-invite.schema'

type Req = FastifyRequest<{ Body: CreateUserWithInviteBody }>

export async function createUserWithInviteController(request: Req, reply: FastifyReply) {
  const { email, name, phone } = request.body
  const orgId = request.organization.id
  const invitedBy = request.user.sub
  const normalizedEmail = email.trim().toLowerCase()

  const [existing] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1)

  const user =
    existing ??
    (await createForUserInvite({
      name,
      email: normalizedEmail,
      phone,
    }))

  await inviteService.create({
    email: normalizedEmail,
    orgId,
    userId: invitedBy,
  })

  return reply.status(201).send({
    id: user.id,
    name: user.name,
    email: user.email,
  })
}
