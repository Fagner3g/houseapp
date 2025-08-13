import z from 'zod'

export const createGoalSchema = {
  tags: ['Goal'],
  description: 'Create a goal',
  operationId: 'createGoal',
  body: z.object({
    title: z.string(),
    desiredWeeklyFrequency: z.number(),
  }),
  response: {
    201: z.null(),
  },
}

export type CreateGoalBody = z.infer<typeof createGoalSchema.body>
