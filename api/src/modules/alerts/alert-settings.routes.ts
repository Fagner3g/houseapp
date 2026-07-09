import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  getAlertSettingsSchema,
  updateAlertSettingsSchema,
} from '@/http/schemas/alerts/settings.schema'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  getAlertSettingsController,
  updateAlertSettingsController,
} from './alert-settings.controller'

export const alertSettingsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/alert-settings', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getAlertSettingsSchema,
    handler: getAlertSettingsController,
  })

  app.patch('/organizations/:slug/alert-settings', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateAlertSettingsSchema,
    handler: updateAlertSettingsController,
  })
}
