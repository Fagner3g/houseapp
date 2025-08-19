import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { createNotificationPolicyController } from '../controllers/notifications/create-notification-policy.controller'
import { deleteNotificationPolicyController } from '../controllers/notifications/delete-notification-policy.controller'
import { listNotificationPoliciesController } from '../controllers/notifications/list-notification-policies.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { createNotificationPolicySchema } from '../schemas/notifications/create-notification-policy.schema'
import { deleteNotificationPolicySchema } from '../schemas/notifications/delete-notification-policy.schema'
import { listNotificationPoliciesSchema } from '../schemas/notifications/list-notification-policies.schema'

export const createNotificationPolicyRoute: FastifyPluginAsyncZod = async app => {
  app.post('/api/notifications/:slug/policies', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createNotificationPolicySchema,
    handler: createNotificationPolicyController,
  })
}

export const listNotificationPoliciesRoute: FastifyPluginAsyncZod = async app => {
  app.get('/api/notifications/:slug/policies', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listNotificationPoliciesSchema,
    handler: listNotificationPoliciesController,
  })
}

export const deleteNotificationPolicyRoute: FastifyPluginAsyncZod = async app => {
  app.delete('/api/notifications/:slug/policies/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteNotificationPolicySchema,
    handler: deleteNotificationPolicyController,
  })
}
