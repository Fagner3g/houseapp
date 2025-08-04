import z from 'zod'

export const getPendingGoalsSchema = {
  tags: ['Goal'],
  description: 'get pending goals',
  operationId: 'getPendingGoals',
  response: {
    200: z.object({
      pendingGoals: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          desiredWeekFrequency: z.number(),
          completionCount: z.number(),
          createdAt: z.date(),
        })
      ),
    }),
  },
}
