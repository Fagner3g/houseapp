import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'

import { createExpense } from '@/functions/expense/create-expense'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'

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
          payToId: z.string(),
          organizationId: z.string(),
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
      const { title, payToId, organizationId, amount, dueDate, description } = request.body

      const ownerId = request.user.sub

      await createExpense({
        title,
        ownerId,
        payToId,
        organizationId,
        amount,
        dueDate: new Date(dueDate),
        description,
      })

      return reply.status(201).send()
    }
  )
}
