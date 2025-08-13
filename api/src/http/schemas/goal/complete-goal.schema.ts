import z from 'zod'

export const completeGoalSchema = {
  tags: ['Goal'],
  description: 'Complete a goal',
  operationId: 'completeGoal',
  body: z.object({
    goalId: z.string(),
  }),
  response: {
    201: z.null(),
  },
}
export type CompleteGoalSchemaBody = z.infer<typeof completeGoalSchema.body>
