import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import type { ValidateTokenSchemaBody } from '@/http/schemas/auth/validate-token.schema'
import { VerifyToken } from '@/http/utils/auth'
import { UnauthorizedError } from '@/http/utils/error'
import { logger } from '@/lib/logger'

type Req = FastifyRequest<{ Body: ValidateTokenSchemaBody }>

export async function validateTokenController(request: Req, reply: FastifyReply) {
  const { token } = request.body

  try {
    const payload = await VerifyToken(token)
    if (!payload.sub) {
      throw new UnauthorizedError()
    }

    const [org] = await db
      .select({ slug: organizations.slug })
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, payload.sub))
      .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .limit(1)

    if (org?.slug) {
      return reply.status(200).send({ valid: true, slug: org.slug })
    }

    // Fallback: caso não exista registro em userOrganizations, verificar se o usuário é owner de alguma org
    const [owned] = await db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.ownerId, payload.sub))
      .limit(1)

    return reply.status(200).send({ valid: true, slug: owned?.slug ?? null })
  } catch (error) {
    logger.error(error)
    throw new UnauthorizedError()
  }
}
