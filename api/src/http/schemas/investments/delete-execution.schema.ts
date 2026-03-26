import z from 'zod'

export const deleteInvestmentExecutionSchema = {
  tags: ['Investments'],
  description: 'Delete a personal investment execution',
  operationId: 'deleteInvestmentExecution',
  params: z.object({
    executionId: z.string(),
  }),
  response: {
    204: z.null(),
  },
}
