import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { listTagsController } from '../controllers/tag/list-tags.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { listTagsSchema } from '../schemas/tag/list-tags.schema'

export const listTagsRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/tags', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listTagsSchema,
    handler: listTagsController,
  })
}
