import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { createExpense } from '../../functions/create-expense'
import { authenticateUserHook } from '../hooks/authenticate-user'

export const createExpenseRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/expenses',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Expense'],
        description: 'Create an expense',
        operationId: 'createExpense',
        body: z.object({
          title: z.string(),
          payTo: z.string(),
          amount: z.number(),
          dueDate: z.coerce.date(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { title, payTo, amount, dueDate } = request.body
      const userId = request.user.sub

      await createExpense({ userId, title, payTo, amount, dueDate })

      return reply.status(201).send()
    }
  )
}
