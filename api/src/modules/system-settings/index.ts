import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  getSystemNotificationSettingsController,
  updateSystemNotificationSettingsController,
} from './controller'
import {
  getSystemNotificationSettingsSchema,
  updateSystemNotificationSettingsSchema,
} from './schema'

export const systemSettingsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/system-settings/notifications', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getSystemNotificationSettingsSchema,
    handler: getSystemNotificationSettingsController,
  })

  app.patch('/organizations/:slug/system-settings/notifications', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateSystemNotificationSettingsSchema,
    handler: updateSystemNotificationSettingsController,
  })
}
