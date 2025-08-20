import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  runAllOwnersTransactionsReport,
  runMyTransactionsReport,
} from '../controllers/reports/transactions.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import {
  runAllOwnersTransactionsReportSchema,
  runMyTransactionsReportSchema,
} from '../schemas/reports/transactions-report.schema'

export const reportsRoutes: FastifyPluginAsyncZod = async app => {
  app.post('/reports/transactions/run', {
    onRequest: [authenticateUserHook],
    schema: runMyTransactionsReportSchema,
    handler: runMyTransactionsReport,
  })

  app.post('/reports/transactions/run-all-owners', {
    onRequest: [authenticateUserHook],
    schema: runAllOwnersTransactionsReportSchema,
    handler: runAllOwnersTransactionsReport,
  })
}
