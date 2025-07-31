import type { FastifyPluginAsyncZod, ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { createOrganizationController } from '@/http/controllers/organization/create-organization'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const bodySchema = z.object({ name: z.string() })

export const createOrganizationSchema = {
  tags: ['Organization'],
  description: 'Create a new organization',
  operationId: 'createOrganization',
  body: bodySchema,
  response: {
    201: z.object({
      organizationSlug: z.string(),
    }),
  },
} as const

export const createOrganizationRoute: FastifyPluginAsyncZod = async app => {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/organizations',
    {
      onRequest: [authenticateUserHook],
      schema: createOrganizationSchema,
    },
    createOrganizationController
  )
}
