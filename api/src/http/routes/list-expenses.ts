import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { listExpenses } from '../../functions/list-expenses'
import { authenticateUserHook } from '../hooks/authenticate-user'

export const listExpensesRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/expenses',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Expense'],
        description: 'List all expenses',
        operationId: 'listExpenses',
        response: {
          200: z.object({
            expenses: z.array(
              z.object({
                id: z.string(),
                userId: z.string(),
                title: z.string(),
                payTo: z.string(),
                amount: z.number(),
                dueDate: z.date(),
                createdAt: z.date(),
              })
            ),
          }),
        },
      },
    },
    async request => {
      const userId = request.user.sub

      const { expenses } = await listExpenses({ userId })

      return { expenses }
    }
  )
}
