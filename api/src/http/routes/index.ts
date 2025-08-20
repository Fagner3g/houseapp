import type { FastifyInstance } from 'fastify'

import { logoutRoute, signInRoute, signUpRoute, validateTokenRoute } from './auth.routes'
import {
  completionGoalRoute,
  createGoalRoute,
  getPendingGoalsRoute,
  getWeekSummaryRoute,
} from './goals.routes'
import { acceptInviteRoute, createInviteRoute, getInvitesRoute } from './invite.routes'
import {
  createOrgRoute,
  deleteOrgRoute,
  listOrgRoute,
  listUsersByOrgRoute,
  renameOrgRoute,
} from './organization.routes'
import { createTagRoute, deleteTagRoute, listTagsRoute, updateTagRoute } from './tag.routes'
import {
  createTransactionRoute,
  deleteTransactionsRoute,
  getTransactionRoute,
  listTransactionRoute,
  updateTransactionRoute,
} from './transaction.routes'
import { createUserWithInviteRoute, getProfileRoute } from './user.routes'

export function createRoutes(app: FastifyInstance) {
  // Auth
  app.register(signInRoute)
  app.register(signUpRoute)
  app.register(validateTokenRoute)
  app.register(logoutRoute)

  // User
  app.register(getProfileRoute)
  app.register(createUserWithInviteRoute)

  // Organization
  app.register(createOrgRoute)
  app.register(renameOrgRoute)
  app.register(deleteOrgRoute)
  app.register(listOrgRoute)
  app.register(listUsersByOrgRoute)

  // Invite
  app.register(acceptInviteRoute)
  app.register(createInviteRoute)
  app.register(getInvitesRoute)

  // Goal
  app.register(completionGoalRoute)
  app.register(createGoalRoute)
  app.register(getPendingGoalsRoute)
  app.register(getWeekSummaryRoute)

  // Transaction
  app.register(createTransactionRoute)
  app.register(getTransactionRoute)
  app.register(listTransactionRoute)
  app.register(deleteTransactionsRoute)
  app.register(updateTransactionRoute)

  // Tag
  app.register(listTagsRoute)
  app.register(createTagRoute)
  app.register(updateTagRoute)
  app.register(deleteTagRoute)
}
