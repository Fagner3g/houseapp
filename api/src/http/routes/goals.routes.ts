import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { completeGoalController } from '../controllers/goal/complete-goal.controller'
import { createGoalController } from '../controllers/goal/create-goal.controller'
import { getPendingGoalsController } from '../controllers/goal/get-pending-goal.controller'
import { getWeekSummaryController } from '../controllers/goal/get-week-summary.controller'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { completeGoalSchema } from '../schemas/goal/complete-goal.schema'
import { createGoalSchema } from '../schemas/goal/create-goal.schema'
import { getPendingGoalsSchema } from '../schemas/goal/get-pending-goal.schema'
import { getWeekSummarySchema } from '../schemas/goal/get-week-summary.schema'

export const completionGoalRoute: FastifyPluginAsyncZod = async app => {
  app.post('/complete-goal', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: completeGoalSchema,
    handler: completeGoalController,
  })
}

export const createGoalRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/goal', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createGoalSchema,
    handler: createGoalController,
  })
}

export const getPendingGoalsRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/pending-goals', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getPendingGoalsSchema,
    handler: getPendingGoalsController,
  })
}

export const getWeekSummaryRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/summary', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getWeekSummarySchema,
    handler: getWeekSummaryController,
  })
}
