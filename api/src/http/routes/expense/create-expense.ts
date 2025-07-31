import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { createExpense } from '@/domain/expense/create-expense'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

export const createExpenseRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/org/:slug/expenses',
    {
      onRequest: [authenticateUserHook],
      schema: {
        tags: ['Expense'],
        description: 'Create an expense',
        operationId: 'createExpense',
        params: z.object({ slug: z.string() }),
        body: z.object({
          title: z.string(),
          payToId: z.string(),
          amount: z.number(),
          dueDate: z.string(),
          description: z.string().optional(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params
      const { title, payToId, amount, dueDate, description } = request.body

      const ownerId = request.user.sub

      await createExpense({
        title,
        ownerId,
        payToId,
        organizationSlug: slug,
        amount,
        dueDate: new Date(dueDate),
        description,
      })

      return reply.status(201).send()
    }
  )
}
