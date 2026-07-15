import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'

import {
  listNotificationsController,
  listPendingNotificationsController,
  markInformationalNotificationsReadController,
  markNotificationReadController,
} from './notification.controller'
import {
  listNotificationsSchema,
  listPendingNotificationsSchema,
  markInformationalNotificationsReadSchema,
  markNotificationReadSchema,
} from './notification.schema'

export const notificationsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/notifications', {
    onRequest: [authenticateUserHook],
    schema: listNotificationsSchema,
    handler: listNotificationsController,
  })

  app.get('/notifications/pending', {
    onRequest: [authenticateUserHook],
    schema: listPendingNotificationsSchema,
    handler: listPendingNotificationsController,
  })

  app.patch('/notifications/read-informational', {
    onRequest: [authenticateUserHook],
    schema: markInformationalNotificationsReadSchema,
    handler: markInformationalNotificationsReadController,
  })

  app.patch('/notifications/:id/read', {
    onRequest: [authenticateUserHook],
    schema: markNotificationReadSchema,
    handler: markNotificationReadController,
  })
}
