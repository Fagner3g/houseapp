import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { listExpenses } from '@/functions/expense/list-expenses'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const listExpensesRoute: FastifyPluginAsyncZod = async app => {
  app.get(
    '/org/:slug/expenses',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Expense'],
        description: 'List expenses for authenticated user',
        operationId: 'listExpenses',
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            expenses: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                ownerId: z.string(),
                payToId: z.string(),
                amount: z.number(),
                dueDate: z.date(),
                description: z.string().nullable(),
                createdAt: z.date(),
              })
            ),
          }),
        },
      },
    },
    async request => {
      const userId = request.user.sub
      const { slug } = request.params

      const { expenses } = await listExpenses({
        userId,
        organizationSlug: slug,
      })

      return { expenses }
    }
  )
}
