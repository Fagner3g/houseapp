import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { getAlertSettingsController } from '../controllers/alerts/get-alert-settings.controller'
import { updateAlertSettingsController } from '../controllers/alerts/update-alert-settings.controller'
import { ackAlertController } from '../controllers/alerts/ack-alert.controller'
import { completeReminderController } from '../controllers/alerts/complete-reminder.controller'
import { createReminderController } from '../controllers/alerts/create-reminder.controller'
import { createRuleController } from '../controllers/alerts/create-rule.controller'
import { deleteReminderController } from '../controllers/alerts/delete-reminder.controller'
import { deleteRuleController } from '../controllers/alerts/delete-rule.controller'
import { listInboxController } from '../controllers/alerts/list-inbox.controller'
import { listRecentDeliveriesController } from '../controllers/alerts/list-recent-deliveries.controller'
import { listPendingExtensionAlertsController } from '../controllers/alerts/list-pending-extension.controller'
import { listRemindersController } from '../controllers/alerts/list-reminders.controller'
import { listRulesController } from '../controllers/alerts/list-rules.controller'
import { markAlertReadController } from '../controllers/alerts/mark-alert-read.controller'
import { previewAlertsController } from '../controllers/alerts/preview-alerts.controller'
import { snoozeReminderController } from '../controllers/alerts/snooze-reminder.controller'
import { updateReminderController } from '../controllers/alerts/update-reminder.controller'
import { updateRuleController } from '../controllers/alerts/update-rule.controller'
import { upsertSeriesRuleController } from '../controllers/alerts/upsert-series-rule.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import {
  ackAlertSchema,
  listInboxSchema,
  listRecentDeliveriesSchema,
  listPendingExtensionAlertsSchema,
  markAlertReadSchema,
  previewAlertsSchema,
} from '../schemas/alerts/delivery.schema'
import {
  getAlertSettingsSchema,
  updateAlertSettingsSchema,
} from '../schemas/alerts/settings.schema'
import {
  completeReminderSchema,
  createReminderSchema,
  deleteReminderSchema,
  listRemindersSchema,
  snoozeReminderSchema,
  updateReminderSchema,
} from '../schemas/alerts/reminder.schema'
import {
  createRuleSchema,
  deleteRuleSchema,
  listRulesSchema,
  updateRuleSchema,
  upsertSeriesRuleSchema,
} from '../schemas/alerts/rule.schema'

export const alertsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/settings/alerts', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getAlertSettingsSchema,
    handler: getAlertSettingsController,
  })

  app.patch('/org/:slug/settings/alerts', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateAlertSettingsSchema,
    handler: updateAlertSettingsController,
  })

  app.get('/org/:slug/reminders', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listRemindersSchema,
    handler: listRemindersController,
  })

  app.post('/org/:slug/reminders', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createReminderSchema,
    handler: createReminderController,
  })

  app.patch('/org/:slug/reminders/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateReminderSchema,
    handler: updateReminderController,
  })

  app.post('/org/:slug/reminders/:id/complete', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: completeReminderSchema,
    handler: completeReminderController,
  })

  app.post('/org/:slug/reminders/:id/snooze', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: snoozeReminderSchema,
    handler: snoozeReminderController,
  })

  app.delete('/org/:slug/reminders/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteReminderSchema,
    handler: deleteReminderController,
  })

  app.get('/org/:slug/alert-rules', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listRulesSchema,
    handler: listRulesController,
  })

  app.post('/org/:slug/alert-rules', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createRuleSchema,
    handler: createRuleController,
  })

  app.patch('/org/:slug/alert-rules/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateRuleSchema,
    handler: updateRuleController,
  })

  app.delete('/org/:slug/alert-rules/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteRuleSchema,
    handler: deleteRuleController,
  })

  app.put('/org/:slug/transactions/:seriesId/alert-rule', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: upsertSeriesRuleSchema,
    handler: upsertSeriesRuleController,
  })

  app.get('/org/:slug/alerts/preview', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: previewAlertsSchema,
    handler: previewAlertsController,
  })

  app.get('/org/:slug/alerts', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listInboxSchema,
    handler: listInboxController,
  })

  app.get('/org/:slug/alerts/recent', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listRecentDeliveriesSchema,
    handler: listRecentDeliveriesController,
  })

  app.patch('/org/:slug/alerts/:id/read', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: markAlertReadSchema,
    handler: markAlertReadController,
  })

  app.get('/me/alerts/pending', {
    onRequest: [authenticateUserHook],
    schema: listPendingExtensionAlertsSchema,
    handler: listPendingExtensionAlertsController,
  })

  app.post('/org/:slug/alerts/:id/ack', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: ackAlertSchema,
    handler: ackAlertController,
  })
}
