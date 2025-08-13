import z from 'zod'

export const getWeekSummarySchema = {
  tags: ['Goal'],
  description: 'Get week summary',
  operationId: 'getWeekSummary',
  response: {
    200: z.object({
      summary: z.object({
        completed: z.number(),
        total: z.number().nullable(),
        goalsPerDay: z
          .record(
            z.string(),
            z.array(z.object({ id: z.string(), title: z.string(), completedAt: z.string() }))
          )
          .nullable(),
      }),
    }),
  },
}
