import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { users } from '@/db/schemas/users'
import type { ValidateTokenSchemaBody } from '@/http/schemas/auth/validate-token.schema'
import { VerifyToken } from '@/http/utils/auth'
import { UnauthorizedError } from '@/http/utils/error'

type Req = FastifyRequest<{ Body: ValidateTokenSchemaBody }>

export async function validateTokenController(request: Req, reply: FastifyReply) {
  const { token } = request.body

  try {
    if (!token) {
      throw new UnauthorizedError()
    }

    const payload = await VerifyToken(token)
    if (!payload) {
      return reply.status(401).send({
        valid: false,
      })
    }

    const [user] = await db
      .select({
        id: users.id,
        defaultOrganizationId: users.defaultOrganizationId,
      })
      .from(users)
      .where(eq(users.id, String(payload.sub)))
      .limit(1)

    if (!user) {
      return reply.status(401).send({ valid: false })
    }

    const [org] = await db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, user.defaultOrganizationId))
      .limit(1)

    return reply.status(200).send({ valid: true, slug: org?.slug })
  } catch {
    throw new UnauthorizedError()
  }
}
