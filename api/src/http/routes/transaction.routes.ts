import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { createTransactionController } from '../controllers/transaction/create-transaction.controller'
import { deleteTransactionsController } from '../controllers/transaction/delete-transactions.controller'
import { getTransactionController } from '../controllers/transaction/get-transaction.controller'
import { listTransactionsController } from '../controllers/transaction/list-transactions.controller'
import { updateTransactionController } from '../controllers/transaction/update-transaction.controller'
import { authenticateUserHook } from '../hooks/authenticate-user'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { createTransactionsSchema } from '../schemas/transaction/create-transaction.schema'
import { deleteTransactionsSchema } from '../schemas/transaction/delete-transactions.schema'
import { getTransactionSchema } from '../schemas/transaction/get-transactions.schema'
import { listTransactionSchema } from '../schemas/transaction/list-transactions.schema'
import { updateTransactionSchema } from '../schemas/transaction/update-transaction.schema'

export const createTransactionRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org/:slug/transaction', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: createTransactionsSchema,
    handler: createTransactionController,
  })
}

export const getTransactionRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/transaction/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getTransactionSchema,
    handler: getTransactionController,
  })
}

export const listTransactionRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/transactions', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listTransactionSchema,
    handler: listTransactionsController,
  })
}

export const deleteTransactionsRoute: FastifyPluginAsyncZod = async app => {
  app.delete('/org/:slug/transactions', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteTransactionsSchema,
    handler: deleteTransactionsController,
  })
}

export const updateTransactionRoute: FastifyPluginAsyncZod = async app => {
  app.patch('/org/:slug/transaction/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: updateTransactionSchema,
    handler: updateTransactionController,
  })
}
