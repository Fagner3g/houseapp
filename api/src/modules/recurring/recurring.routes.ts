import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  createRecurringController,
  deleteRecurringController,
  getRecurringController,
  listRecurringController,
  previewUpdateRecurringController,
  updateRecurringController,
} from './recurring.controller'
import {
  createRecurringSchema,
  deleteRecurringSchema,
  getRecurringSchema,
  listRecurringSchema,
  previewUpdateRecurringSchema,
  updateRecurringSchema,
} from './recurring.schema'

export const recurringRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/recurring-transactions', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listRecurringSchema,
    handler: listRecurringController,
  })

  app.post('/organizations/:slug/recurring-transactions', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createRecurringSchema,
    handler: createRecurringController,
  })

  app.get('/organizations/:slug/recurring-transactions/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getRecurringSchema,
    handler: getRecurringController,
  })

  app.patch('/organizations/:slug/recurring-transactions/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateRecurringSchema,
    handler: updateRecurringController,
  })

  app.post('/organizations/:slug/recurring-transactions/:id/preview-update', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: previewUpdateRecurringSchema,
    handler: previewUpdateRecurringController,
  })

  app.delete('/organizations/:slug/recurring-transactions/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteRecurringSchema,
    handler: deleteRecurringController,
  })
}
