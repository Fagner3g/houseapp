import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { VerifyToken } from '@/modules/auth'
import { db } from '@/db'
import { organizations, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const validateTokenRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/validate-token',
    {
      schema: {
        tags: ['auth'],
        description: 'Validate Token',
        operationId: 'validateToken',
        body: z.object({
          token: z.string(),
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
            slug: z.string().optional(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { token } = request.body

      if (!token) {
        return reply.status(401).send({
          valid: false,
        })
      }

      try {
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
        return reply.status(401).send({ valid: false })
      }
    }
  )
}
