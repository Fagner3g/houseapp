import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { getExpense } from '@/domain/expense/get-expense'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const getExpenseRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/expenses/:expenseId',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Expense'],
        description: 'Get expense by id',
        operationId: 'getExpense',
        params: z.object({
          expenseId: z.string(),
        }),
        response: {
          200: z.object({
            expense: z
              .object({
                id: z.string(),
                title: z.string(),
                ownerId: z.string(),
                payToId: z.string(),
                amount: z.number(),
                dueDate: z.date(),
                description: z.string().nullable(),
                createdAt: z.date(),
              })
              .nullable(),
          }),
        },
      },
    },
    async request => {
      const { expenseId } = request.params

      const { expense } = await getExpense({ id: expenseId })

      return { expense: expense ?? null }
    }
  )
}
