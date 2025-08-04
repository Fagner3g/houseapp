import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { createExpenseController } from '../controllers/expense/create-expense.controller'
import { getExpenseController } from '../controllers/expense/get-expenses.controller'
import { listExpenseController } from '../controllers/expense/list-expense.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { createExpenseSchema } from '../schemas/expense/create-expense.schema'
import { getExpenseSchema } from '../schemas/expense/get-expense.schema'
import { listExpensesSchema } from '../schemas/expense/list-expenses.schema'

export const createExpenseRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/expenses', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createExpenseSchema,
    handler: createExpenseController,
  })
}

export const getExpenseRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/expenses/:expenseId', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getExpenseSchema,
    handler: getExpenseController,
  })
}

export const listExpensesRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/expenses', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listExpensesSchema,
    handler: listExpenseController,
  })
}
