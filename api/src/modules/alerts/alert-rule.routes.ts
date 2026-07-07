import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  createAlertRuleController,
  deleteAlertRuleController,
  evaluateAlertRulesController,
  listAlertRulesController,
  listManualAlertTargetsController,
  sendManualAlertController,
  updateAlertRuleController,
} from './alert-rule.controller'
import {
  createAlertRuleSchema,
  deleteAlertRuleSchema,
  evaluateAlertRulesSchema,
  listAlertRulesSchema,
  listManualAlertTargetsSchema,
  sendManualAlertSchema,
  updateAlertRuleSchema,
} from './alert-rule.schema'

export const alertRulesRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/alert-rules', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listAlertRulesSchema,
    handler: listAlertRulesController,
  })

  app.post('/organizations/:slug/alert-rules', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createAlertRuleSchema,
    handler: createAlertRuleController,
  })

  app.patch('/organizations/:slug/alert-rules/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateAlertRuleSchema,
    handler: updateAlertRuleController,
  })

  app.delete('/organizations/:slug/alert-rules/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteAlertRuleSchema,
    handler: deleteAlertRuleController,
  })

  app.post('/organizations/:slug/alert-rules/evaluate', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: evaluateAlertRulesSchema,
    handler: evaluateAlertRulesController,
  })

  app.post('/organizations/:slug/alerts/send-manual', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: sendManualAlertSchema,
    handler: sendManualAlertController,
  })

  app.get('/organizations/:slug/alerts/manual-targets', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listManualAlertTargetsSchema,
    handler: listManualAlertTargetsController,
  })
}
