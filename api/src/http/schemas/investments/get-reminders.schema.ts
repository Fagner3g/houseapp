import z from 'zod'

import { reminderItemResponseSchema } from './shared'

export const getInvestmentRemindersSchema = {
  tags: ['Investments'],
  description: 'Get current month investment reminders',
  operationId: 'getInvestmentReminders',
  response: {
    200: z.object({
      reminders: z.object({
        summary: z.object({
          total: z.number(),
          overdue: z.number(),
          pending: z.number(),
        }),
        items: z.array(reminderItemResponseSchema),
      }),
    }),
  },
}
