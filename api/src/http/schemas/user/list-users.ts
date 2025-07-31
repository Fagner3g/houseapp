import type { FastifyRequest } from 'fastify'
import z from 'zod'

export const listUsersSchema = {
  tags: ['User'],
  description: 'List all users in an organization',
  operationId: 'listUsers',
  params: z.object({ slug: z.string() }),
  response: {
    200: z.object({
      users: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          phone: z.string(),
          ddd: z.string(),
          avatarUrl: z.string(),
          createdAt: z.date(),
        })
      ),
    }),
  },
}

const listUsersParams = z.object({ slug: z.string() })

export type ListUsersRequest = FastifyRequest<{
  Params: z.infer<typeof listUsersParams>
}>
