import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { createTagController } from '../controllers/tag/create-tag.controller'
import { deleteTagController } from '../controllers/tag/delete-tag.controller'
import { listTagsController } from '../controllers/tag/list-tags.controller'
import { updateTagController } from '../controllers/tag/update-tag.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { createTagSchema } from '../schemas/tag/create-tag.schema'
import { deleteTagSchema } from '../schemas/tag/delete-tag.schema'
import { listTagsSchema } from '../schemas/tag/list-tags.schema'
import { updateTagSchema } from '../schemas/tag/update-tag.schema'

export const listTagsRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/tags', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listTagsSchema,
    handler: listTagsController,
  })
}

export const createTagRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/tags', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createTagSchema,
    handler: createTagController,
  })
}

export const updateTagRoute: FastifyPluginAsyncZod = async app => {
  app.put('/org/:slug/tags/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateTagSchema,
    handler: updateTagController,
  })
}

export const deleteTagRoute: FastifyPluginAsyncZod = async app => {
  app.delete('/org/:slug/tags/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteTagSchema,
    handler: deleteTagController,
  })
}
