import type { FastifyInstance } from 'fastify'

import { signInRoute, signUpRoute, validateTokenRoute } from './auth.routes'
import { createExpenseRoute, getExpenseRoute, listExpensesRoute } from './expense.routes'
import {
  completionGoalRoute,
  createGoalRoute,
  getPendingGoalsRoute,
  getWeekSummaryRoute,
} from './goals.routes'
import { acceptInviteRoute, createInviteRoute, getInviteRoute } from './invite.routes'
import {
  createOrgRoute,
  deleteOrgRoute,
  listOrganizationsRoute as listOrgRoute,
  listUsersByOrgRoute,
  renameOrgRoute,
} from './organization.routes'

export function createRoutes(app: FastifyInstance) {
  // Auth
  app.register(signInRoute)
  app.register(signUpRoute)
  app.register(validateTokenRoute)

  // User

  // Organization
  app.register(createOrgRoute)
  app.register(renameOrgRoute)
  app.register(deleteOrgRoute)
  app.register(listOrgRoute)
  app.register(listUsersByOrgRoute)

  // Invite
  app.register(acceptInviteRoute)
  app.register(createInviteRoute)
  app.register(getInviteRoute)

  // Goal
  app.register(completionGoalRoute)
  app.register(createGoalRoute)
  app.register(getPendingGoalsRoute)
  app.register(getWeekSummaryRoute)

  // Expense
  app.register(createExpenseRoute)
  app.register(getExpenseRoute)
  app.register(listExpensesRoute)
}
