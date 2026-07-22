import type { FastifyInstance } from 'fastify'

import { systemSettingsRoutes } from '@/modules/system-settings'
import { accountsRoutes } from '@/modules/accounts/account.routes'
import { alertRulesRoutes } from '@/modules/alerts/alert-rule.routes'
import { alertSettingsRoutes } from '@/modules/alerts/alert-settings.routes'
import { notificationsRoutes } from '@/modules/alerts/notification.routes'
import { attachmentsRoutes } from '@/modules/attachments/attachment.routes'
import { authRoutes } from '@/modules/auth/auth.routes'
import { cardsRoutes } from '@/modules/cards/card.routes'
import { categoriesRoutes } from '@/modules/categories/category.routes'
import { recurringRoutes } from '@/modules/recurring/recurring.routes'
import { aiRoutes } from '@/modules/ai/ai.routes'
import { reportsRoutes } from '@/modules/reports/report.routes'
import { splitsRoutes } from '@/modules/splits/split.routes'
import { statementsRoutes } from '@/modules/statements/statement.routes'
import { transactionsRoutes } from '@/modules/transactions/transaction.routes'
import { healthRoute } from './health.routes'
import { acceptInviteRoute, createInviteRoute, getInvitesRoute } from './invite.routes'
import {
  createOrgRoute,
  deleteOrgRoute,
  listOrgRoute,
  listUsersByOrgRoute,
  renameOrgRoute,
} from './organization.routes'
import {
  createUserWithInviteRoute,
  getProfileRoute,
  updateUserNotificationsRoute,
  updateUserRoute,
} from './user.routes'
import { jobsRoutes } from './jobs.routes'

export function createRoutes(app: FastifyInstance) {
  app.register(healthRoute)
  app.register(jobsRoutes)

  app.register(authRoutes)

  app.register(getProfileRoute)
  app.register(createUserWithInviteRoute)
  app.register(updateUserRoute)
  app.register(updateUserNotificationsRoute)

  app.register(createOrgRoute)
  app.register(renameOrgRoute)
  app.register(deleteOrgRoute)
  app.register(listOrgRoute)
  app.register(listUsersByOrgRoute)

  app.register(acceptInviteRoute)
  app.register(createInviteRoute)
  app.register(getInvitesRoute)

  app.register(accountsRoutes)
  app.register(cardsRoutes)
  app.register(categoriesRoutes)
  app.register(recurringRoutes)
  app.register(transactionsRoutes)
  app.register(splitsRoutes)
  app.register(attachmentsRoutes)
  app.register(statementsRoutes)
  app.register(reportsRoutes)
  app.register(aiRoutes)
  app.register(alertRulesRoutes)
  app.register(alertSettingsRoutes)
  app.register(notificationsRoutes)
  app.register(systemSettingsRoutes)
}
