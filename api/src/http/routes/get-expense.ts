import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { getExpense } from '../../functions/get-expense'
import { authenticateUserHook } from '../hooks/authenticate-user'

export const getExpenseRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/expenses/:id',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Expense'],
        description: 'Get an expense by id',
        operationId: 'getExpense',
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            expense: z
              .object({
                id: z.string(),
                userId: z.string(),
                title: z.string(),
                payTo: z.string(),
                amount: z.number(),
                dueDate: z.date(),
                createdAt: z.date(),
              })
              .nullable(),
          }),
        },
      },
    },
    async request => {
      const { id } = request.params
      const userId = request.user.sub

      const { expense } = await getExpense({ id, userId })

      return { expense }
    }
  )
}
