import type { FastifyInstance } from 'fastify'

import { logoutRoute, signInRoute, signUpRoute, validateTokenRoute } from './auth.routes'
import {
  completionGoalRoute,
  createGoalRoute,
  getPendingGoalsRoute,
  getWeekSummaryRoute,
} from './goals.routes'
import { healthRoute } from './health.routes'
import { acceptInviteRoute, createInviteRoute, getInvitesRoute } from './invite.routes'
import { jobsRoutes } from './jobs.routes'
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
  getTransactionInstallmentsRoute,
  getTransactionRoute,
  listTransactionRoute,
  payTransactionRoute,
  updateTransactionRoute,
} from './transaction.routes'
import { createUserWithInviteRoute, getProfileRoute, updateUserRoute } from './user.routes'

export function createRoutes(app: FastifyInstance) {
  // Health
  app.register(healthRoute)

  // Jobs
  app.register(jobsRoutes)

  // Auth
  app.register(signInRoute)
  app.register(signUpRoute)
  app.register(validateTokenRoute)
  app.register(logoutRoute)

  // User
  app.register(getProfileRoute)
  app.register(createUserWithInviteRoute)
  app.register(updateUserRoute)

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
  app.register(getTransactionInstallmentsRoute)
  app.register(listTransactionRoute)
  app.register(deleteTransactionsRoute)
  app.register(updateTransactionRoute)
  app.register(payTransactionRoute)

  // Reports removidos

  // Tag
  app.register(listTagsRoute)
  app.register(createTagRoute)
  app.register(updateTagRoute)
  app.register(deleteTagRoute)
}
